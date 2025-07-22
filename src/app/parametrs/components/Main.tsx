"use client";

import {
  Box,
  Button,
  Checkbox,
  Container,
  FormControl,
  FormControlLabel,
  Grid2,
  Input,
  InputLabel,
  MenuItem,
  Select,
  type SelectChangeEvent,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { motion } from "framer-motion";
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
import { GetSensors } from "./db";
import { DynamicFormComponent } from "~/app/dev/components/SensorCheckForm";
import { InventorySettings } from "./InventorySettings";

type DeviceType = {
  name: string;
  product: number;
  familyId: number;
  decoder: SensorParserCombinator;
};

export default function Parameters() {
  const [order_number, set_order_number] = useState<string>("");
  const [decoder, setDecoder] = useState<SensorParserCombinator | undefined>();
  const [formValues, setFormValues] = useState<ParsedSensorData>({});
  const [family_id, set_family_id] = useState<number>(1);
  const [company_name, set_company_name] = useState<string>("");
  const [addToStock, setAddToStock] = useState<boolean>(false);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const router = useRouter();
  const set_target_sensor_data = useSensorStore(
    (state) => state.set_target_sensor_data,
  );
  const set_credentials = useGoogleIDSstore((state) => state.set_credentials);

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
    (value: number) => {
      const selectedDevice = devices?.find(
        (device) => device.product === value,
      );
      setDecoder(selectedDevice?.decoder);

      const newValues: ParsedSensorData = {};
      selectedDevice?.decoder?.forEach((parser) => {
        const defaultValue = parser.output.default;
        // Ensure values are never undefined
        if (defaultValue !== undefined) {
          newValues[parser.output.name] = defaultValue;
        } else {
          // Provide appropriate default based on type
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
  const handleFamilyIdChange = (value: number) => {
    set_family_id(value);
    handleSelectChange(value);
  };

  useEffect(() => {
    handleSelectChange(family_id);
  }, [family_id, handleSelectChange]);

  const handleValueChange = (name: string, value: ParsedSensorValue) => {
    setFormValues((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 2, md: 4 } }}>
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
            <Typography
              variant={isMobile ? "h4" : "h3"}
              sx={{
                mb: { xs: 4, md: 8 },
                fontWeight: "bold",
                color: "primary.main",
                textAlign: "center",
              }}
            >
              SENZEMO
            </Typography>

            <Box
              sx={{
                width: "100%",
                maxWidth: { xs: "100%", md: "800px" },
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
                    value={family_id}
                    onChange={(e: SelectChangeEvent<number>) => {
                      handleFamilyIdChange(Number(e.target.value));
                    }}
                  >
                    {devices?.map((device) => (
                      <MenuItem key={device.familyId} value={device.product}>
                        {device.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl fullWidth>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={addToStock}
                        onChange={(e) => setAddToStock(e.target.checked)}
                      />
                    }
                    label="Add to stock inventory"
                  />
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
                        required
                      />
                    </FormControl>

                    <FormControl fullWidth>
                      <InputLabel htmlFor="serial-number">
                        Order Number
                      </InputLabel>
                      <Input
                        id="serial-number"
                        value={order_number}
                        onChange={(e) => set_order_number(e.target.value)}
                        required
                      />
                    </FormControl>
                  </>
                )}

                <Grid2 container spacing={{ xs: 2, md: 3 }} sx={{ mt: 1 }}>
                  {decoder?.map((parser) => (
                    <Grid2
                      size={{ xs: 12, sm: 6, md: 4 }}
                      key={parser.output.name}
                    >
                      <DynamicFormComponent
                        my_key={parser.output.name}
                        my_type={parser.output.type}
                        value={
                          formValues[parser.output.name] ??
                          parser.output.default ??
                          (parser.output.type === "string"
                            ? ""
                            : parser.output.type === "number"
                              ? 0
                              : parser.output.type === "boolean"
                                ? false
                                : parser.output.type === "enum"
                                  ? (parser.output.enum_values?.[0]?.value ?? 0)
                                  : "")
                        }
                        enum_values={parser.output.enum_values}
                        onValueChange={handleValueChange}
                      />
                    </Grid2>
                  ))}
                </Grid2>
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
                sx={{
                  px: { xs: 4, md: 6 },
                  py: { xs: 1.5, md: 2 },
                  fontSize: { xs: "1rem", md: "1.1rem" },
                  fontWeight: 600,
                  minWidth: { xs: "200px", md: "250px" },
                }}
                onClick={async () => {
                  if (!addToStock && company_name.trim() === "") {
                    alert("Company name must not be empty.");
                    return;
                  }

                  const formData = {
                    family_id,
                    addToStock,
                    company_name: addToStock ? "" : company_name,
                    order_number: addToStock ? "" : order_number,
                    ...formValues,
                  };

                  set_target_sensor_data(formData);
                  console.log("Data stored:", formData);

                  const result = await createFolderAndSpreadsheet(
                    addToStock ? null : company_name,
                    addToStock ? null : order_number,
                  );

                  set_credentials(result);
                  router.push("/dev");
                }}
              >
                Start Scan
              </Button>
            </Box>
          </Box>
        </Box>

        {/* Inventory Settings Section */}
        <Box sx={{ mt: 4 }}>
          <InventorySettings />
        </Box>
      </motion.div>
    </Container>
  );
}
