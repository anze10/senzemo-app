"use client";

import {
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  Input,
  InputLabel,
  MenuItem,
  Select,
  type SelectChangeEvent,
  Step,
  StepLabel,
  Stepper,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { motion } from "framer-motion";
import { Home } from "lucide-react";
import Image from "next/image";
import { createFolderAndSpreadsheet } from "~/server/GAPI_ACTION/create_folder";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSensorStore } from "~/app/dev/components/SensorStore";
import { useGoogleIDSstore } from "./Credentisal";
import type {
  ParsedSensorData,
  ParsedSensorValue,
  SensorParserCombinator,
} from "~/app/dev/components/Reader/ParseSensorData";
import { useQuery } from "@tanstack/react-query";
import { CreateOrder, GetSensors } from "./db";
import { DynamicFormComponent } from "~/app/dev/components/SensorCheckForm";
//import { InventorySettings } from "./InventorySettings";
import { ConfigSelector } from "./ConfigSelector";
import { BackButton } from "src/app/components/BackButton";
import { ToleranceRangeInput } from "./Tolerancerangeinput";
//import { resetSensorStore } from "~/app/dev/components/SensorStore";

type DeviceType = {
  name: string;
  product: number;
  familyId: number;
  decoder: SensorParserCombinator;
};

const SETUP_STEPS = [
  "Ustvarjam naročilo",
  "Ustvarjam mapo na Drive",
  "Ustvarjam preglednico",
  "Ustvarjam CSV datoteko",
];

export default function Parameters() {
  const [order_number, set_order_number] = useState<string>("");
  const [decoder, setDecoder] = useState<SensorParserCombinator | undefined>();
  const [formValues, setFormValues] = useState<ParsedSensorData>({});
  const [family_id, set_family_id] = useState<number>(1);
  const [company_name, set_company_name] = useState<string>("");
  const [addToStock, setAddToStock] = useState<boolean>(false);
  const [product_id, set_product_id] = useState<number>(0);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [validationError, setValidationError] = useState<string | null>(null);
  const router = useRouter();

  // --- Setup progress dialog state ---
  const [setupOpen, setSetupOpen] = useState(false);
  const [setupStep, setSetupStep] = useState(0);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [batchNumber, setBatchNumber] = useState("");
  const set_order_id = useSensorStore((state) => state.set_order_id);
  const set_target_sensor_data = useSensorStore(
    (state) => state.set_target_sensor_data,
  );
  const set_credentials = useGoogleIDSstore((state) => state.set_credentials);
  useEffect(() => {
    // Zbriši persistirano stanje iz localStorage
    localStorage.removeItem("sensor-store"); // zamenjaj z dejanskim imenom iz persist config

    // Resetiraj store nazaj na začetno stanje (ne samo eno polje)
    useSensorStore.setState({
      sensors: [],
      current_sensor_index: 0,
      current_decoder: [],
      target_sensor_data: undefined,
      start_time: 0,
      end_time: 0,
      OrderID: undefined, // preveri pravilno ime/tip iz svojega store-a
    });
  }, []);

  const { data: sensors, isLoading } = useQuery({
    queryKey: ["sensors"],
    queryFn: async () => await GetSensors(),
  });

  const devices: DeviceType[] | undefined = useMemo(() => {
    return sensors?.map((device) => ({
      name: device.sensorName,
      product: device.productId,
      familyId: device.familyId,
      decoder: device.decoder as SensorParserCombinator,
    }));
  }, [sensors]);

  const handleSelectChange = useCallback(
    (familyId: number, productId: number) => {
      const selectedDevice = devices?.find(
        (device) => device.familyId === familyId && device.product === productId,
      );
      setDecoder(selectedDevice?.decoder);

      const newValues: ParsedSensorData = {};
      selectedDevice?.decoder?.forEach((parser) => {
        // NOVO: dodano na vrh - za tolerance polja shrani from/upTo namesto
        // navadne default vrednosti, potem preskoči ostanek (return)
        if (parser.output.tolerance) {
          newValues[`${parser.output.name}__from`] = parser.output.from ?? 0;
          newValues[`${parser.output.name}__upTo`] = parser.output.upTo ?? 0;
          return;
        }

        // OBSTOJEČE - nespremenjeno
        const defaultValue = parser.output.default;

        if (defaultValue !== undefined) {
          newValues[parser.output.name] = defaultValue;
        } else {
          switch (parser.output.type) {
            case "string":
              newValues[parser.output.name] = "";
              break;
            case "number":
              newValues[parser.output.name] = 0;
              break;
            case "boolean":
              newValues[parser.output.name] = false;
              break;
            case "enum":
              newValues[parser.output.name] =
                parser.output.enum_values?.[0]?.value ?? 0;
              break;
            default:
              newValues[parser.output.name] = "";
          }
        }
      });
      setFormValues(newValues);
    },
    [devices],
  );
  const handleFamilyIdChange = (familyId: number, productId: number) => {
    set_family_id(familyId);
    set_product_id(productId);
    handleSelectChange(familyId, productId);
  };

  useEffect(() => {
    handleSelectChange(family_id, product_id);
  }, [family_id, product_id, handleSelectChange]);

  const handleValueChange = (name: string, value: ParsedSensorValue) => {
    setFormValues((prev) => ({ ...prev, [name]: value }));
  };

  console.log(devices);

  return (
    <><Box sx={{ display: "flex", alignItems: "center", gap: 2, pl: 2, pt: 2 }}>
      <Image
        src="/senzemo-logo.svg"
        alt="Senzemo"
        width={120}
        height={32}
        priority
      />
    </Box>
      <Container maxWidth="xl" sx={{ py: { xs: 2, md: 4 } }}>
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <BackButton fallbackHref="/dashboard" />
          <IconButton
            onClick={() => router.push("/dashboard")}
            size="small"
            title="Domov"
            sx={{
              color: "text.secondary",
              transform: "translateY(-6px)",
            }}
          >
            <Home size={20} />
          </IconButton>
        </Box>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Box component="form">
            {isLoading && (
              <Typography
                variant="h6"
                sx={{ textAlign: "center", color: "text.secondary" }}
              >
                Loading...
              </Typography>
            )}

            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                minHeight: { xs: "auto", md: "80vh" },
                py: { xs: 3, md: 6 },
              }}
            >
              {/* <Image
                src="/senzemo-logo.svg"
                alt="Senzemo"
                width={180}
                height={48}
                className="mb-6"
                priority /> */}

              <Box
                sx={{
                  width: "100%",
                  maxWidth: { xs: "100%", md: "960px" },
                  backgroundColor: "background.paper",
                  borderRadius: 2,
                  p: { xs: 3, md: 6 },
                  boxShadow: theme.shadows[4],
                }}
              >
                <Typography
                  variant={isMobile ? "h6" : "h5"}
                  sx={{
                    mb: { xs: 3, md: 6 },
                    textAlign: "center",
                    fontWeight: 600,
                    color: "text.primary",
                  }}
                >
                  Configuration
                </Typography>

                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    gap: { xs: 3, md: 4 },
                  }}
                >
                  <FormControl fullWidth>
                    <InputLabel htmlFor="family_id">Izberi senzor</InputLabel>
                    <Select
                      id="family_id"
                      value={`${family_id}_${product_id}`}
                      onChange={(e: SelectChangeEvent<string>) => {
                        const parts = e.target.value.split("_");
                        const newFamilyId = Number(parts[0]);
                        const newProductId = Number(parts[1]);
                        handleFamilyIdChange(newFamilyId, newProductId);
                      }}
                    >
                      {devices?.map((device) => (
                        <MenuItem
                          key={`${device.familyId}_${device.product}`}
                          value={`${device.familyId}_${device.product}`}
                        >
                          {device.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  {/* Izbira/shranjevanje configov iz Backblaze B2 - override privzetih
        vrednosti iz baze glede na stranko */}
                  <ConfigSelector
                    familyId={family_id}
                    productId={product_id}
                    currentValues={formValues}
                    onApplyConfig={(values) => setFormValues(values)} />

                  <FormControl fullWidth>
                    <FormControlLabel
                      control={<Checkbox
                        checked={addToStock}
                        onChange={(e) => setAddToStock(e.target.checked)} />}
                      label="Add to stock inventory" />
                  </FormControl>

                  {!addToStock && (
                    <>
                      <FormControl fullWidth>
                        <InputLabel htmlFor="Company_name">
                          Company Name
                        </InputLabel>
                        <Input
                          id="Company_name"
                          value={company_name}
                          onChange={(e) => set_company_name(e.target.value)}
                          required />
                      </FormControl>

                      <FormControl fullWidth>
                        <InputLabel htmlFor="serial-number">
                          Order Number
                        </InputLabel>
                        <Input
                          id="serial-number"
                          value={order_number}
                          onChange={(e) => set_order_number(e.target.value)}
                          required />
                      </FormControl>
                    </>
                  )}
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel htmlFor="batch_number">Batch Number</InputLabel>
                    <Input
                      id="batch_number"
                      value={batchNumber}
                      onChange={(e) => setBatchNumber(e.target.value)}
                    />
                  </FormControl>

                  <Grid container spacing={{ xs: 2, md: 3 }} sx={{ mt: 1 }}>
                    {decoder?.map((parser) => (
                      <Grid size={{ xs: 12, sm: 6, md: 4 }} key={parser.output.name}>
                        {parser.output.tolerance ? (
                          <ToleranceRangeInput
                            label={parser.output.name}
                            from={(formValues[`${parser.output.name}__from`] as number) ??
                              parser.output.from ??
                              0}
                            upTo={(formValues[`${parser.output.name}__upTo`] as number) ??
                              parser.output.upTo ??
                              0}
                            onChange={(from, upTo) => {
                              setFormValues((prev) => ({
                                ...prev,
                                [`${parser.output.name}__from`]: from,
                                [`${parser.output.name}__upTo`]: upTo,
                              }));
                            }} />
                        ) : (
                          <DynamicFormComponent
                            my_key={parser.output.name}
                            my_type={parser.output.type}
                            value={formValues[parser.output.name] ??
                              parser.output.default ??
                              (parser.output.type === "string"
                                ? ""
                                : parser.output.type === "number"
                                  ? 0
                                  : parser.output.type === "boolean"
                                    ? false
                                    : parser.output.type === "enum"
                                      ? (parser.output.enum_values?.[0]?.value ?? 0)
                                      : "")}
                            enum_values={parser.output.enum_values}
                            onValueChange={handleValueChange} />
                        )}
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              </Box>

              <Box
                sx={{
                  mt: { xs: 4, md: 8 },
                  display: "flex",
                  justifyContent: "center",
                }}
              >
                <Button
                  variant="contained"
                  color="primary"
                  size={isMobile ? "large" : "large"}
                  disabled={setupOpen}
                  sx={{
                    px: { xs: 4, md: 6 },
                    py: { xs: 1.5, md: 2 },
                    fontSize: { xs: "1rem", md: "1.1rem" },
                    fontWeight: 600,
                    minWidth: { xs: "200px", md: "250px" },
                  }}
                  onClick={async () => {
                    if (!addToStock) {
                      const missingFields: string[] = [];
                      if (company_name.trim() === "") missingFields.push("Company Name");
                      if (order_number.trim() === "") missingFields.push("Order Number");

                      if (missingFields.length > 0) {
                        setValidationError(
                          `Prosim, izpolni naslednja polja: ${missingFields.join(", ")}.`,
                        );
                        return;
                      }
                    }

                    setSetupError(null);
                    setSetupStep(0);
                    setSetupOpen(true);

                    try {
                      const formData = {
                        family_id,
                        addToStock,
                        company_name: addToStock ? "" : company_name,
                        order_number: addToStock ? "" : order_number,
                        ...formValues,
                      };


                      // Korak 1: Ustvari naročilo v bazi
                      set_order_id(
                        await CreateOrder(company_name, Number(order_number))
                      );

                      set_target_sensor_data(formData);
                      console.log("Data stored:", formData);

                      // Koraki 2-4: mapa, preglednica, CSV - vsi trije se
                      // dejansko zgodijo znotraj enega server klica, zato
                      // simuliramo napredek postopoma za boljšo UX povratno
                      // informacijo (server sam ne poroča vmesnih korakov)
                      setSetupStep(1);
                      const stepTimer1 = setTimeout(() => setSetupStep(2), 600);
                      const stepTimer2 = setTimeout(() => setSetupStep(3), 1200);

                      const measurementFields = (decoder ?? [])
                        .filter((p) => p.output.physicalData)
                        .map((p) => p.output.name);

                      const result = await createFolderAndSpreadsheet(
                        addToStock ? null : company_name,
                        addToStock ? null : order_number,
                        measurementFields,
                        batchNumber
                      );

                      clearTimeout(stepTimer1);
                      clearTimeout(stepTimer2);
                      setSetupStep(SETUP_STEPS.length);

                      set_credentials(result);

                      // kratek premor da uporabnik vidi "dokončano" stanje
                      await new Promise((resolve) => setTimeout(resolve, 400));

                      router.push("/dev");
                    } catch (error) {
                      console.error("Error creating order:", error);
                      const message = error instanceof Error
                        ? error.message
                        : "Prišlo je do neznane napake.";
                      setSetupError(message);
                    }
                  }}
                >
                  Start Scan
                </Button>
              </Box>
            </Box>
          </Box>

          {/* Inventory Settings Section
    <Box sx={{ mt: 4 }}>
      <InventorySettings />
    </Box> */}
        </motion.div>

        {/* Progress dialog - prikazuje napredek ustvarjanja mape/dokumentov na Drive */}
        <Dialog
          open={setupOpen}
          onClose={() => {
            if (setupError) setSetupOpen(false);
          }}
          disableEscapeKeyDown={!setupError}
          maxWidth="xs"
          fullWidth
        >
          <DialogTitle>
            {setupError ? "Napaka pri pripravi" : "Pripravljam podatke..."}
          </DialogTitle>
          <DialogContent>
            {!setupError ? (
              <>
                <Stepper activeStep={setupStep} orientation="vertical">
                  {SETUP_STEPS.map((label, index) => (
                    <Step key={label}>
                      <StepLabel
                        icon={index === setupStep ? (
                          <CircularProgress size={20} />
                        ) : undefined}
                      >
                        {label}
                      </StepLabel>
                    </Step>
                  ))}
                </Stepper>
              </>
            ) : (
              <>
                <Typography color="error" sx={{ mb: 2 }}>
                  {setupError}
                </Typography>
                <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                  <Button
                    variant="contained"
                    onClick={() => setSetupOpen(false)}
                  >
                    Zapri
                  </Button>
                </Box>
              </>
            )}
          </DialogContent>
        </Dialog>
      </Container>
      <Dialog open={validationError !== null} onClose={() => setValidationError(null)}>
        <DialogTitle>Manjkajoči podatki</DialogTitle>
        <DialogContent>
          <Typography>{validationError}</Typography>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={() => setValidationError(null)}>
            V redu
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}