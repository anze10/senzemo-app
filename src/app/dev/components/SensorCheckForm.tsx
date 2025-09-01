"use client";

import { useMemo, useRef, useState } from "react";
import type {
  ParsedSensorData,
  ParsedSensorValue,
  //ParseSensorData,
} from "./Reader/ParseSensorData";
import { useSensorStore } from "./SensorStore";
import { usePrinterStore } from "./printer/printer_settinsgs_store";
import { EncodeSensorData } from "./Reader/WriteSensorData";
import {
  checkPortStatus,
  connectToPort,
  getOperationStatus,
  readDataFromPort,
  resetOperationFlags,
  writeDataToPort,
} from "./Reader/HandleClick";
//import { convertSensorDataToBytes, validateSensorData, verifyConversion, compareOriginalWithReadback, debugConversionFlow, analyzeParserConfiguration, normalizeSensorData, detailedDataComparison, displayDetailedConversion, validateParserConfiguration, checkDecoderMatch, validateByteData, suggestSensorWriteFixes, checkSensorProtocol, generateDiagnosticReport } from "./ReprogramSensor";

import MenuIcon from "@mui/icons-material/Menu";
import {
  AppBar,
  Avatar,
  Container,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  Menu,
  Modal,
  type SelectChangeEvent,
  Toolbar,
  Tooltip,
} from "@mui/material";
import { Grid } from '@mui/material'
import { PrintSticker } from "./printer/printer_server_side";
import {
  Box,
  Button,
  Checkbox,
  Collapse,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
//import deepEqual from "deep-equal";
import { useMutation, useQuery } from "@tanstack/react-query";
import { RightDecoder } from "./Reader/Get_Sensors_database_chace";
import { GetSensors } from "~/app/sensors/components/backend";
import { insertIntoDB, type ProductionListWithoutId } from "./PrismaCode";
import Printer_settings from "./printer/Printer_settings";
import { logOut } from "~/server/LOGIN_LUCIA_ACTION/auth.action";
import { getCurrentSession } from "~/server/LOGIN_LUCIA_ACTION/session";
import { removeComponentsFromStockForSensor } from "~/app/inventory/components/backent";

// Konfiguracija za avtomatsko odštevanje komponent
// TODO: To bi lahko bilo shranjen v localStorage ali backend nastavitvah
const getAutoDeductComponents = (): boolean => {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("autoDeductComponents");
    return stored !== null ? JSON.parse(stored) : true; // privzeto omogočeno
  }
  return true;
};

const setAutoDeductComponents = (enabled: boolean): void => {
  if (typeof window !== "undefined") {
    localStorage.setItem("autoDeductComponents", JSON.stringify(enabled));
  }
};

type ImportantSensorData = Record<
  string,
  {
    value: ParsedSensorValue;
    my_type: string;
    enum_values?: { value: number; mapped: string }[];
  }
>;

export function SensorCheckForm() {
  const portRef = useRef<SerialPort | null>(null);
  const selectedPrinter = usePrinterStore((state) => state.selectedPrinter);
  const sensor_parsers = useSensorStore((state) => state.current_decoder);
  const [AddToInv, setAddToInv] = useState<boolean>(false);
  const [showUnimportantParameters, setShowUnimportantParameters] =
    useState<boolean>(false);

  // State za avtomatsko odštevanje komponent
  const [autoDeductComponents, setAutoDeductComponentsState] =
    useState<boolean>(() => getAutoDeductComponents());

  // Funkcija za posodabljanje nastavitve
  const updateAutoDeductComponents = (enabled: boolean) => {
    setAutoDeductComponentsState(enabled);
    setAutoDeductComponents(enabled);
  };
  const orderId = useSensorStore((state) => state.OrderID);
  const current_sensor_index = useSensorStore(
    (state) => state.current_sensor_index,
  );

  const current_sensor = useSensorStore((state) => {
    if (state.sensors.length !== 0)
      return state.sensors[state.current_sensor_index];
    else return undefined;
  });

  // Check if current sensor is accepted (use the okay field from the sensor)
  const isCurrentSensorAccepted = current_sensor?.okay ?? false;

  // Remove static dataforDB object - it will be created dynamically in useMemo
  const all_sensors = useSensorStore((state) => state.sensors);

  const add_new_sensor = useSensorStore((state) => state.add_new_sensor);

  const set_sensor_data = useSensorStore((state) => state.set_sensor_data);

  const set_sensor_status = useSensorStore((state) => state.set_sensor_status);
  const [isModalOpen, setIsModalOpen] = useState(false);

  //const [isReprogramming, setIsReprogramming] = useState(false);

  const [anchorElNav, setAnchorElNav] = useState<null | HTMLElement>(null);
  const [anchorElUser, setAnchorElUser] = useState<null | HTMLElement>(null);

  const handleDashboard = () => {
    setIsModalOpen(!isModalOpen);
  };

  const handleOpenNavMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElNav(event.currentTarget);
  };

  const handleOpenUserMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElUser(event.currentTarget);
  };

  const handleCloseNavMenu = () => {
    setAnchorElNav(null);
  };

  const handleCloseUserMenu = () => {
    setAnchorElUser(null);
  };

  const session = useQuery({
    queryKey: ["session"],
    queryFn: getCurrentSession,
  });
  const GetSensorName = useQuery({
    queryKey: ["sensor_name"],
    queryFn: async () => {
      const data = await GetSensors();
      return data.map((sensor) => ({
        id: sensor.id,
        sensorName: sensor.sensorName,
        familyId: sensor.familyId,
        productId: sensor.productId,
        photograph: sensor.photograph,
        payloadDecoder: sensor.payloadDecoder,
        decoder: sensor.decoder,
        description: sensor.description,
      }));
    },
  });
  const set_current_sensor_index = useSensorStore(
    (state) => state.set_current_sensor_index,
  );

  const { data: sensors } = useQuery({
    queryKey: ["sensors"],
    queryFn: () => GetSensors(),
  });

  const onSubmit = async (data: ParsedSensorData, okay: boolean) => {
    console.log("onSubmit before", {
      all_sensors,
      current_sensor_index,
      current_sensor,
    });

    set_sensor_status(current_sensor_index, okay);

    set_sensor_data(current_sensor_index, data);

    console.log("onSubmit after", {
      all_sensors,
      current_sensor_index,
      current_sensor,
    });

    // set_current_sensor_index(current_sensor_index + 1);
    const uint_array = await GetDataFromSensor();
    if (!uint_array || !sensors) return;

    const decoder = RightDecoder(uint_array, sensors);
    if (!decoder) return;

    add_new_sensor(decoder, uint_array);
  };

  const GetDataFromSensor = async (maxRetries = 3) => {
    console.log("GetDataFromSensor called");

    let attempts = 0;
    let lastError: Error | null = null;

    while (attempts < maxRetries) {
      attempts++;
      console.log(`Read attempt ${attempts}/${maxRetries}`);

      try {
        // Always check and reset operation status first
        const operationStatus = getOperationStatus();
        console.log("Current operation status:", operationStatus);

        // Reset flags if they're stuck
        if (
          operationStatus.isReadingInProgress ||
          operationStatus.isWritingInProgress
        ) {
          console.log("Resetting stuck operation flags before attempting read");
          resetOperationFlags();
          // Add a small delay to ensure flags are reset
          await new Promise((resolve) => setTimeout(resolve, 200));
        }

        if (!portRef.current) {
          console.log("No port reference, connecting to port...");
          portRef.current = await connectToPort();
        } else {
          console.log("Port reference exists, checking status...");
          if (!checkPortStatus(portRef.current)) {
            console.log("Port is not ready, reconnecting...");

            // Close the existing port properly before reconnecting
            try {
              await portRef.current.close();
            } catch (closeError) {
              console.warn("Error closing port before reconnect:", closeError);
            }

            // Small delay before reconnecting
            await new Promise((resolve) => setTimeout(resolve, 300));
            portRef.current = await connectToPort();
          }
        }

        console.log("Port ready, reading data...");

        // Set a timeout in case the read operation gets stuck
        const readPromise = readDataFromPort(portRef.current);
        const timeoutPromise = new Promise<null>((_, reject) => {
          setTimeout(
            () =>
              reject(new Error("Read operation timed out after 15 seconds")),
            15000,
          );
        });

        // Race the read operation against a timeout
        const result = await Promise.race([readPromise, timeoutPromise]);

        if (!result) {
          console.warn("Read returned no data, will retry");
          throw new Error("No data received from sensor");
        }

        console.log("Data read successfully:", result);
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.error(
          `Failed to get data from sensor (attempt ${attempts}):`,
          error,
        );

        // Reset operation flags on error to prevent getting stuck
        resetOperationFlags();

        // Wait before retrying with exponential backoff
        if (attempts < maxRetries) {
          const backoffMs = 500 * Math.pow(2, attempts - 1); // 500ms, 1000ms, 2000ms...
          console.log(`Waiting ${backoffMs}ms before next attempt...`);
          await new Promise((resolve) => setTimeout(resolve, backoffMs));
        }
      }
    }

    // All attempts failed
    console.error(`All ${maxRetries} attempts to get sensor data failed`);
    if (lastError) {
      throw lastError;
    }
    throw new Error("Failed to get sensor data after multiple attempts");
  };

  // useEffect(() => {
  //   useSensorStore.setState({ start_time: Date.now() });
  // }, []);

  const [important_sensor_data, unimportant_sensor_data, dataforDB] =
    useMemo(() => {
      const important: ImportantSensorData = {};
      const unimportant: ImportantSensorData = {};

      // Create fresh dataforDB object
      const dataforDB: ProductionListWithoutId = {
        orderId: null,
        DevEUI: null,
        AppEUI: null,
        AppKey: null,
        DeviceType: null,
        SubBands: null,
        CustomFWVersion: null,
        FrequencyRegion: null,
        HWVersion: null,
        FWVersion: null,
        SendPeriod: null,
        ACK: null,
        MovementThreshold: null,
        DateCreated: new Date(),
        Batch: null,
      };

      console.log("sensor_parsers", sensor_parsers);
      console.log("current_sensor", current_sensor);
      console.log("Sensor parser: ", sensor_parsers);

      if (!current_sensor) return [important, unimportant, dataforDB];

      console.log(
        "Available sensor data keys:",
        Object.keys(current_sensor.data),
      );

      Object.entries(current_sensor.data).forEach(([key, value]) => {
        const parser = sensor_parsers.find(
          (parser) => parser.output.name === key,
        );
        console.log(`Processing key: ${key}, value: ${value}`);

        if (!parser?.output) {
          console.error("Parser not found for key", key);
          return;
        }

        // Map sensor data to database fields based on actual sensor parser keys
        // DevEUI mapping
        if (key === "dev_eui") {
          dataforDB.DevEUI = typeof value === "string" ? value : String(value);
          console.log(`Mapped DevEUI: ${dataforDB.DevEUI}`);
        }
        // AppEUI mapping (join_eui or app_eui)
        else if (key === "app_eui" || key === "join_eui") {
          dataforDB.AppEUI = typeof value === "string" ? value : String(value);
          console.log(`Mapped AppEUI: ${dataforDB.AppEUI}`);
        }
        // AppKey mapping
        else if (key === "app_key") {
          dataforDB.AppKey = typeof value === "string" ? value : String(value);
          console.log(`Mapped AppKey: ${dataforDB.AppKey}`);
        }
        // FrequencyRegion mapping (from enum values)
        else if (key === "lora_freq_reg") {
          // Convert enum value to string representation
          if (parser.output.enum_values) {
            let mappedValue: string | undefined;
            if (typeof value === "number") {
              const enumEntry = parser.output.enum_values.find(
                (e: { value: number; mapped: string }) => e.value === value,
              );
              mappedValue = enumEntry?.mapped;
            } else if (typeof value === "string") {
              // If value is already a mapped string, use it directly
              const enumEntry = parser.output.enum_values.find(
                (e: { value: number; mapped: string }) => e.mapped === value,
              );
              mappedValue = enumEntry?.mapped ?? value;
            }
            if (mappedValue) {
              dataforDB.FrequencyRegion = mappedValue;
              console.log(
                `Mapped FrequencyRegion: ${dataforDB.FrequencyRegion}`,
              );
            }
          }
        }
        // SubBands mapping
        else if (key === "sub_bands" || key === "lora_sub_bands") {
          dataforDB.SubBands =
            typeof value === "string" ? value : String(value);
          console.log(`Mapped SubBands: ${dataforDB.SubBands}`);
        }
        // HWVersion mapping
        else if (
          key === "hw_version" ||
          key === "device_hw_ver" ||
          key === "device_device_hw_ver"
        ) {
          dataforDB.HWVersion =
            typeof value === "string" ? value : String(value);
          console.log(`Mapped HWVersion: ${dataforDB.HWVersion}`);
        }
        // FWVersion mapping
        else if (key === "fw_version" || key === "device_fw_ver") {
          dataforDB.FWVersion =
            typeof value === "string" ? value : String(value);
          console.log(`Mapped FWVersion: ${dataforDB.FWVersion}`);
        }
        // SendPeriod mapping
        else if (key === "send_period" || key === "lora_send_period") {
          dataforDB.SendPeriod =
            typeof value === "string" ? value : String(value);
          console.log(`Mapped SendPeriod: ${dataforDB.SendPeriod}`);
        }
        // ACK mapping
        else if (key === "ack" || key === "lora_ack") {
          dataforDB.ACK = typeof value === "string" ? value : String(value);
          console.log(`Mapped ACK: ${dataforDB.ACK}`);
        }
        // MovementThreshold mapping
        else if (key === "movement_threshold" || key === "device_mov_thr") {
          dataforDB.MovementThreshold =
            typeof value === "string" ? value : String(value);
          console.log(
            `Mapped MovementThreshold: ${dataforDB.MovementThreshold}`,
          );
        }
        // DeviceType mapping from family_id and product_id
        else if (key === "family_id" || key === "product_id") {
          // We'll construct DeviceType from family_id and product_id
          const currentFamily = current_sensor.data.family_id;
          const currentProduct = current_sensor.data.product_id;
          if (currentFamily && currentProduct) {
            const foundSensor = GetSensorName.data?.find(
              (sensor: {
                familyId: number;
                productId: number;
                sensorName: string;
              }) =>
                sensor.familyId === currentFamily &&
                sensor.productId === currentProduct,
            );
            if (foundSensor) {
              dataforDB.DeviceType = foundSensor.sensorName;
            }
            console.log(`Mapped DeviceType: ${dataforDB.DeviceType}`);
          }
        }

        // Generic mapping for exact field matches (fallback)
        if (key in dataforDB) {
          (dataforDB as Record<string, unknown>)[key] =
            typeof value === "string" ? value : String(value);
          console.log(`Generic mapping for ${key}: ${value}`);
        }

        if (parser.output.important) {
          important[key] = {
            value: value as ParsedSensorValue,
            my_type: parser.output.type,
            enum_values: parser.output.enum_values,
          };
        } else {
          unimportant[key] = {
            value: value as ParsedSensorValue,
            my_type: parser.output.type,
            enum_values: parser.output.enum_values,
          };
        }
      });

      return [important, unimportant, dataforDB];
    }, [GetSensorName.data, current_sensor, sensor_parsers]);

  // Define the mutation after dataforDB is available
  const insertIntoDatabaseMutation = useMutation({
    mutationKey: ["InsertintoDatabase"],
    mutationFn: () => {
      console.log("Mutation called with dataforDB:", dataforDB);

      // Validate that we have critical data
      if (!dataforDB.DevEUI || dataforDB.DevEUI.trim() === "") {
        console.error("DevEUI validation failed:", dataforDB.DevEUI);
        throw new Error(
          "DevEUI is required but not found or empty in sensor data",
        );
      }

      // Additional validation for other important fields
      const validationErrors: string[] = [];
      if (!dataforDB.DeviceType) validationErrors.push("DeviceType is missing");
      if (!dataforDB.FrequencyRegion)
        validationErrors.push("FrequencyRegion is missing");

      if (validationErrors.length > 0) {
        console.warn("Validation warnings:", validationErrors);
        // Don't throw error, just warn - these fields might be optional
      }

      console.log("Validation passed, inserting into database...");
      console.log(
        "Final dataforDB being sent to database:",
        JSON.stringify(dataforDB, null, 2),
      );
      return insertIntoDB(dataforDB, orderId);
    },
    onMutate: async () => {
      console.log("DATABASE MUTATION STARTING - onMutate");
      console.log("onMutate - current sensor index:", current_sensor_index);
      console.log("onMutate - current dataforDB:", dataforDB);
    },
    onError: (error) => {
      console.error("Error in InsertintoDB:", error);
      console.error("Failed dataforDB was:", dataforDB);
    },
    onSuccess: (data) => {
      console.log("onSuccess - data inserted:", data);
    },
  });

  function handleDynamicChange(name: string, value: ParsedSensorValue): void {
    if (!current_sensor) return;
    const new_data = { ...current_sensor.data, [name]: value };
    set_sensor_data(current_sensor_index, new_data);
  }

  async function handleSubmit(
    dataHandler: (data: ParsedSensorData) => Promise<void>,
  ): Promise<void> {
    if (!current_sensor) {
      console.log("No current sensor", sensors);
      const uint_array = await GetDataFromSensor();
      if (!uint_array || !sensors) return;
      const decoder = RightDecoder(uint_array, sensors);
      console.log("Decoder", decoder);
      if (!decoder) return;

      add_new_sensor(decoder, uint_array);
      return;
    }
    dataHandler(current_sensor.data as ParsedSensorData)
      .then(async () => {
        set_sensor_data(
          current_sensor_index,
          current_sensor.data as ParsedSensorData,
        );

        const uint_array = await GetDataFromSensor();
        if (!uint_array || !sensors) return;

        const decoder = RightDecoder(uint_array, sensors);
        if (!decoder) return;

        add_new_sensor(decoder, uint_array);
      })
      .catch((error) => {
        console.error("Error in data handler:", error);
      });
  }

  return (
    <>
      <AppBar position="static" sx={{ backgroundColor: "#f5f5f5" }}>
        <Container maxWidth={false}>
          <Toolbar disableGutters>
            {/* <AdbIcon sx={{ display: { xs: 'none', md: 'flex' }, mr: 1, color: "black" }} />*/}
            <Typography
              variant="h6"
              noWrap
              component="a"
              href="#"
              sx={{
                mr: 2,
                display: { xs: "none", md: "flex" },
                fontFamily: "monospace",
                fontWeight: 700,
                letterSpacing: ".3rem",
                color: "black",
                textDecoration: "none",
              }}
            >
              SENZEMO
            </Typography>

            <Box sx={{ flexGrow: 1, display: { xs: "flex", md: "none" } }}>
              <IconButton
                size="large"
                aria-label="menu"
                aria-controls="menu-appbar"
                aria-haspopup="true"
                onClick={handleOpenNavMenu}
                color="inherit"
              >
                <MenuIcon sx={{ color: "black" }} />
              </IconButton>
              <Menu
                id="menu-appbar"
                anchorEl={anchorElNav}
                anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
                keepMounted
                transformOrigin={{ vertical: "top", horizontal: "left" }}
                open={Boolean(anchorElNav)}
                onClose={handleCloseNavMenu}
              ></Menu>
            </Box>

            <Typography
              variant="h5"
              noWrap
              component="a"
              href="#"
              sx={{
                mr: 2,
                display: { xs: "flex", md: "none" },
                flexGrow: 1,
                fontFamily: "monospace",
                fontWeight: 700,
                letterSpacing: ".3rem",
                color: "black",
                textDecoration: "none",
              }}
            >
              LOGO
            </Typography>

            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "10px 20px",
                flexGrow: 1,
              }}
            >
              <Button
                onClick={async () => {
                  // Reset operation flags before reading
                  resetOperationFlags();

                  const uint_array = await GetDataFromSensor();
                  if (!uint_array || !sensors) return;
                  const decoder = RightDecoder(uint_array, sensors);
                  if (!decoder) return;
                  add_new_sensor(decoder, uint_array);
                }}
                sx={{
                  backgroundColor: "#4CAF50",
                  color: "white",
                  padding: "10px 20px",
                  border: "none",
                  cursor: "pointer",
                  "&:hover": {
                    backgroundColor: "#388e3c",
                  },
                }}
              >
                Open Serial Port
              </Button>
            </Box>
            <Box sx={{ flexGrow: 0, display: "flex", alignItems: "center" }}>
              {/* Indikator za auto-deduct nastavitev */}
              <Box
                sx={{
                  mr: 2,
                  px: 1,
                  py: 0.5,
                  backgroundColor: autoDeductComponents
                    ? "success.light"
                    : "warning.light",
                  borderRadius: 1,
                  fontSize: "0.75rem",
                }}
              >
                <Typography
                  variant="caption"
                  sx={{ color: "white", fontWeight: "bold" }}
                >
                  {autoDeductComponents ? "Auto-deduct ON" : "Auto-deduct OFF"}
                </Typography>
              </Box>

              <Tooltip title="Open settings">
                <IconButton onClick={handleOpenUserMenu} sx={{ p: 0 }}>
                  <Avatar alt="User Avatar" src={session.data?.user?.picture} />
                </IconButton>
              </Tooltip>
              <Typography sx={{ ml: 1, color: "black" }}>
                {session?.data?.user?.name ?? "User"}
              </Typography>

              <Menu
                sx={{ mt: "45px" }}
                id="menu-appbar"
                anchorEl={anchorElUser}
                anchorOrigin={{ vertical: "top", horizontal: "right" }}
                keepMounted
                transformOrigin={{ vertical: "top", horizontal: "right" }}
                open={Boolean(anchorElUser)}
                onClose={handleCloseUserMenu}
              >
                <MenuItem
                  onClick={() => {
                    handleCloseUserMenu();
                    //handleAccount();
                  }}
                >
                  <Typography sx={{ textAlign: "center", color: "black" }}>
                    Account
                  </Typography>
                </MenuItem>

                <MenuItem
                  onClick={() => {
                    updateAutoDeductComponents(!autoDeductComponents);
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Checkbox
                      checked={autoDeductComponents}
                      onChange={(e) =>
                        updateAutoDeductComponents(e.target.checked)
                      }
                      size="small"
                    />
                    <Typography sx={{ textAlign: "center", color: "black" }}>
                      Auto-deduct Components
                    </Typography>
                  </Box>
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    setAddToInv(!AddToInv);
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Checkbox
                      checked={AddToInv}
                      onChange={(e) =>
                        setAddToInv(e.target.checked)
                      }
                      size="small"
                    />
                    <Typography sx={{ textAlign: "center", color: "black" }}>
                      Don&apos;t Add to Inventory
                    </Typography>
                  </Box>
                </MenuItem>


                <MenuItem
                  onClick={() => {
                    handleCloseUserMenu();
                    handleDashboard();
                  }}
                >
                  <Typography sx={{ textAlign: "center", color: "black" }}>
                    Printer Settings
                  </Typography>
                </MenuItem>

                <Modal
                  open={isModalOpen}
                  onClose={() => setIsModalOpen(false)}
                  aria-labelledby="printer-settings-modal"
                  aria-describedby="printer-settings-modal-description"
                >
                  <Box
                    sx={{
                      position: "absolute",
                      top: "50%",
                      left: "50%",
                      transform: "translate(-50%, -50%)",
                      bgcolor: "background.paper",
                      boxShadow: 24,
                      p: 4,
                      borderRadius: 2,
                      width: 400,
                    }}
                  >
                    <Printer_settings onClose={() => setIsModalOpen(false)} />
                  </Box>
                </Modal>

                <MenuItem
                  onClick={async () => {
                    handleCloseUserMenu();
                    await logOut();
                  }}
                >
                  <Typography sx={{ textAlign: "center", color: "black" }}>
                    Logout
                  </Typography>
                </MenuItem>
              </Menu>
            </Box>
          </Toolbar>
        </Container>
      </AppBar>
      <Paper elevation={3} sx={{ p: 3, borderRadius: 2 }}>
        <form>
          <Box
            sx={{
              mb: 2,
              p: 3,
              borderRadius: 2,
              backgroundColor: "white",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "200px",
              width: "100%",
              boxShadow: 3,
            }}
          >
            <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
              Key Parameters
            </Typography>
            <Box
              sx={{
                display: "flex",
                flexWrap: "wrap",
                gap: 3,
                justifyContent: "center",
                width: "100%",
              }}
            >
              {Object.entries(important_sensor_data).map(([key, value]) => (
                <Box
                  key={key}
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    backgroundColor: "background.paper",
                    border: "1px solid",
                    borderColor: "divider",
                    minWidth: "200px",
                    textAlign: "center",
                    boxShadow: 1,
                    "&:hover": {
                      boxShadow: 3,
                      transform: "scale(1.05)",
                      transition: "all 0.3s ease",
                    },
                  }}
                >
                  <DynamicFormComponent
                    my_key={key}
                    my_type={value.my_type}
                    value={value.value}
                    onValueChange={handleDynamicChange}
                    enum_values={value.enum_values}
                  />
                </Box>
              ))}
            </Box>
          </Box>

          <Box sx={{ mb: 2 }}>
            <Button
              variant="text"
              size="small"
              endIcon={
                showUnimportantParameters ? (
                  <ExpandLessIcon />
                ) : (
                  <ExpandMoreIcon />
                )
              }
              onClick={() =>
                setShowUnimportantParameters(!showUnimportantParameters)
              }
            >
              {showUnimportantParameters ? "Hide Details" : "Show Details"}
            </Button>

            <Collapse in={showUnimportantParameters}>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                {Object.entries(unimportant_sensor_data).map(([key, value]) => (
                  <Grid size={{ xs: 12, sm: 6, md: 4 }} key={key}>
                    <DynamicFormComponent
                      my_key={key}
                      my_type={value.my_type}
                      value={value.value}
                      enum_values={value.enum_values}
                      onValueChange={handleDynamicChange}
                    />
                  </Grid>
                ))}
              </Grid>
            </Collapse>
          </Box>

          <Divider sx={{ my: 3 }} />
          {!AddToInv ? (
            <Box
              sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}
            >
              {" "}
              <Button
                variant="contained"
                color="success"
                onClick={async () => {
                  console.log("Accept button clicked");
                  console.log("Current sensor index:", current_sensor_index);
                  console.log(
                    "Current sensor accepted state:",
                    isCurrentSensorAccepted,
                  );

                  try {
                    if (!current_sensor) {
                      console.log("No current sensor available");
                      return;
                    }

                    // Prevent accepting already accepted sensors
                    if (isCurrentSensorAccepted) {
                      console.log("Sensor already accepted, skipping processing");
                      return;
                    }

                    console.log("Processing accept for current sensor");
                    const data = current_sensor.data as ParsedSensorData;

                    // IMPORTANT: Set a loading state indicator
                    const acceptButton = document.querySelector(
                      'button[color="success"]',
                    );
                    if (acceptButton) {
                      acceptButton.textContent = "Processing...";
                      acceptButton.setAttribute("disabled", "true");
                    }

                    // Set sensor status to accepted
                    set_sensor_status(current_sensor_index, true);
                    set_sensor_data(current_sensor_index, data);
                    console.log(
                      "Sensor marked as accepted for index:",
                      current_sensor_index,
                    );

                    // Insert current sensor data into database
                    console.log("Inserting current sensor data into database...");
                    await insertIntoDatabaseMutation.mutateAsync();

                    // Odštej komponente iz zaloge po uspešni vstavitvi v bazo
                    // Preverimo, ali je avtomatsko odštevanje omogočeno
                    if (autoDeductComponents) {
                      // Najprej poišči sensorId na podlagi family_id in product_id
                      const familyId = current_sensor.data.family_id as number;
                      const productId = current_sensor.data.product_id as number;

                      if (familyId && productId && GetSensorName.data) {
                        const foundSensor = GetSensorName.data.find(
                          (sensor: {
                            id: number;
                            familyId: number;
                            productId: number;
                            sensorName: string;
                          }) =>
                            sensor.familyId === familyId &&
                            sensor.productId === productId,
                        );

                        if (foundSensor) {
                          try {
                            console.log(
                              `Removing components from stock for sensor ID: ${foundSensor.id} (${foundSensor.sensorName})`,
                            );
                            await removeComponentsFromStockForSensor(
                              foundSensor.id,
                            );
                            console.log(
                              "Components successfully removed from stock",
                            );
                          } catch (componentError) {
                            console.error(
                              "Error removing components from stock:",
                              componentError,
                            );
                            // Ne prekini procesa, samo logiraj napako
                            // Uporabnik lahko nadaljuje z delom, čeprav komponente niso bile odštete
                          }
                        } else {
                          console.warn(
                            `Sensor not found for familyId: ${familyId}, productId: ${productId}`,
                          );
                        }
                      } else {
                        console.warn(
                          "Missing familyId, productId, or sensor data for component removal",
                        );
                      }
                    } else {
                      console.log(
                        "Auto-deduct components is disabled, skipping component removal",
                      );
                    }

                    try {
                      await PrintSticker(
                        data.dev_eui as string,
                        data.family_id as number,
                        data.product_id as number,
                        selectedPrinter,
                      );
                    } catch (printError) {
                      console.error("Error printing sticker:", printError);
                      // Continue execution even if printing fails
                    }

                    // Reset operation flags to ensure clean state before reading
                    resetOperationFlags();

                    // Delay to ensure USB connection is stable
                    await new Promise((resolve) => setTimeout(resolve, 500));

                    // Try to get data from the next sensor with robust retry mechanism
                    console.log(
                      "Reading new sensor data with retry mechanism...",
                    );
                    const uint_array = await GetDataFromSensor(3); // Retry up to 3 times

                    if (!uint_array || !sensors) {
                      console.warn("Failed to get new sensor data after retries");
                      // Ensure UI updates even if we couldn't get new sensor data
                      if (acceptButton) {
                        acceptButton.textContent = "Accept";
                        acceptButton.removeAttribute("disabled");
                      }
                      return;
                    }

                    const decoder = RightDecoder(uint_array, sensors);
                    if (!decoder) {
                      console.warn("Failed to decode new sensor data");
                      // Ensure UI updates
                      if (acceptButton) {
                        acceptButton.textContent = "Accept";
                        acceptButton.removeAttribute("disabled");
                      }
                      return;
                    }

                    console.log(
                      "Adding new sensor (this will reset accepted state)",
                    );
                    add_new_sensor(decoder, uint_array);
                    console.log(
                      "New sensor added, current_sensor_index is now:",
                      current_sensor_index + 1,
                    );
                    console.log(
                      "Button should now show 'Accept' for the new sensor",
                    );

                    // Force a UI update to ensure the button shows "Accept" for the new sensor
                    if (acceptButton) {
                      acceptButton.textContent = "Accept";
                      acceptButton.removeAttribute("disabled");
                    }
                  } catch (error) {
                    console.error("Error in accept button:", error);

                    // Reset flags on error to prevent getting stuck
                    resetOperationFlags();

                    // Ensure the UI is updated even after an error
                    const acceptButton = document.querySelector(
                      'button[color="success"]',
                    );
                    if (acceptButton) {
                      acceptButton.textContent = "Accept";
                      acceptButton.removeAttribute("disabled");
                    }
                  }
                }}
                sx={{ flex: 1 }}
                disabled={isCurrentSensorAccepted}
              >
                {isCurrentSensorAccepted ? "Accepted" : "Accept"}
              </Button>
            </Box>
          ) : (
            <Box
              sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}
            >
              <Button

                variant="contained"
                color="info"
                onClick={async () => {
                  console.log("Don't add to inventory button clicked");
                  console.log("Current sensor index:", current_sensor_index);

                  try {
                    if (!current_sensor) {
                      console.log("No current sensor available");
                      return;
                    }

                    // Prevent processing already accepted sensors
                    if (isCurrentSensorAccepted) {
                      console.log("Sensor already accepted, skipping processing");
                      return;
                    }

                    console.log("Processing don't add to inventory for current sensor");
                    const data = current_sensor.data as ParsedSensorData;

                    // Set sensor status to accepted (but won't add to database)
                    set_sensor_status(current_sensor_index, true);
                    set_sensor_data(current_sensor_index, data);
                    console.log(
                      "Sensor marked as accepted (store only) for index:",
                      current_sensor_index,
                    );

                    // Skip database insertion - only store in state
                    console.log("Skipping database insertion - storing in store only");

                    // Print sticker if needed
                    try {
                      await PrintSticker(
                        data.dev_eui as string,
                        data.family_id as number,
                        data.product_id as number,
                        selectedPrinter,
                      );
                    } catch (printError) {
                      console.error("Error printing sticker:", printError);
                      // Continue execution even if printing fails
                    }

                    // Reset operation flags to ensure clean state before reading
                    resetOperationFlags();

                    // Delay to ensure USB connection is stable
                    await new Promise((resolve) => setTimeout(resolve, 500));

                    // Try to get data from the next sensor with robust retry mechanism
                    console.log(
                      "Reading new sensor data with retry mechanism...",
                    );
                    const uint_array = await GetDataFromSensor(3); // Retry up to 3 times

                    if (!uint_array || !sensors) {
                      console.warn("Failed to get new sensor data after retries");
                      return;
                    }

                    const decoder = RightDecoder(uint_array, sensors);
                    if (!decoder) {
                      console.warn("Failed to decode new sensor data");
                      return;
                    }

                    console.log(
                      "Adding new sensor (this will reset accepted state)",
                    );
                    add_new_sensor(decoder, uint_array);
                    console.log(
                      "New sensor added, current_sensor_index is now:",
                      current_sensor_index + 1,
                    );

                  } catch (error) {
                    console.error("Error in don't add to inventory button:", error);

                    // Reset flags on error to prevent getting stuck
                    resetOperationFlags();
                  }
                }}
                sx={{ flex: 1 }}
                disabled={isCurrentSensorAccepted}
              >
                {isCurrentSensorAccepted ? "Stored" : "Accept without inventory"}
              </Button>
            </Box>
          )}

          <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
            <Button
              variant="contained"
              color="warning"
              onClick={async () => {
                console.log("Reprogram button clicked");

                if (!current_sensor) {
                  console.error("No current sensor available");
                  return;
                }

                if (!sensor_parsers) {
                  console.error("No sensor parsers available");
                  return;
                }

                try {
                  console.log("Current sensor data:", current_sensor.data);
                  console.log("Sensor parsers:", sensor_parsers);

                  // Encode sensor data to bytes
                  const encodedData = EncodeSensorData(
                    sensor_parsers,
                    current_sensor.data,
                  );
                  console.log("Encoded data:", encodedData);
                  console.log("Encoded data length:", encodedData.length);
                  console.log(
                    "Encoded data as hex:",
                    Array.from(encodedData)
                      .map((b) => b.toString(16).padStart(2, "0"))
                      .join(" "),
                  );

                  // Ensure we have a serial port connection
                  if (!portRef.current) {
                    console.log("No port connection, connecting...");
                    portRef.current = await connectToPort();
                  } else {
                    console.log("Port exists, checking state...");

                    // Use helper function to check port status
                    if (!checkPortStatus(portRef.current)) {
                      console.log("Port is not ready, reconnecting...");
                      try {
                        portRef.current = await connectToPort();
                      } catch (reconnectError) {
                        console.error("Failed to reconnect:", reconnectError);
                        throw reconnectError;
                      }
                    }
                  }

                  console.log("Port connection:", portRef.current);
                  console.log(
                    "Final port status:",
                    checkPortStatus(portRef.current),
                  );

                  // Write binary data directly to port
                  await writeDataToPort(portRef.current, encodedData);

                  console.log("Sensor reprogrammed successfully");

                  // Optional: Read response from sensor to verify
                  console.log("Waiting for sensor response...");
                  await new Promise((resolve) => setTimeout(resolve, 500));
                } catch (error) {
                  console.error("Error reprogramming sensor:", error);
                }
              }}
              sx={{ flex: 1 }}
            >
              Reprogram
            </Button>
            <Button
              variant="outlined"
              color="warning"
              onClick={() =>
                handleSubmit((data: ParsedSensorData) => onSubmit(data, false))
              }
              sx={{ flex: 1 }}
            >
              Reject
            </Button>
          </Box>

          <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
            <Button
              variant="contained"
              color="error"
              href="/konec"
              onClick={async () => {
                //await createFolderAndSpreadsheet();
                useSensorStore.setState({ end_time: Date.now() });
                set_current_sensor_index(0);
              }}
              sx={{ flex: 1, maxWidth: "200px" }}
            >
              Finish
            </Button>
          </Box>
        </form>
      </Paper >
    </>
  );
}

export function DynamicFormComponent({
  my_key,
  my_type,
  value,
  enum_values,
  onValueChange,
}: {
  my_key: string;
  my_type: string;
  value: ParsedSensorValue;
  enum_values?: { value: number; mapped: string }[];
  onValueChange: (name: string, value: ParsedSensorValue) => void;
}) {
  const handleChange = (
    e:
      | React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
      | SelectChangeEvent<unknown>,
  ) => {
    let value: ParsedSensorValue = e.target.value as ParsedSensorValue;

    if (my_type === "number") {
      value = Number(value);
    } else if (my_type === "boolean") {
      value = (e.target as HTMLInputElement).checked;
    }

    onValueChange(my_key, value);
  };

  return (
    <FormControl fullWidth>
      {my_type === "boolean" ? (
        <Box display="flex" alignItems="center">
          <Checkbox
            checked={Boolean(value)}
            onChange={handleChange}
            color="primary"
            sx={{ backgroundColor: getStatusColor2(my_key, value) }}
          />
          <InputLabel>{my_key}</InputLabel>
        </Box>
      ) : my_type === "number" ? (
        <TextField
          label={my_key}
          type="number"
          value={value}
          onChange={handleChange}
          sx={{ backgroundColor: getStatusColor2(my_key, value) }}
        />
      ) : my_type === "string" ? (
        <TextField
          label={my_key}
          value={value}
          onChange={handleChange}
          slotProps={{
            input: {
              readOnly: my_key === "join_eui",
            },
          }}
          sx={{ backgroundColor: getStatusColor2(my_key, value) }}
        />
      ) : my_type === "enum" && enum_values ? (
        (() => {
          let primerjator = 0;
          switch (value) {
            case "EU868":
              primerjator = 5;
              break;
            case "US915":
              primerjator = 8;
              break;
            case "AS923":
              primerjator = 3;
              break;
            default:
              break;
          }

          return (
            <FormControl
              fullWidth
              sx={{ backgroundColor: getStatusColor2(my_key, primerjator) }}
            >
              <InputLabel>{my_key}</InputLabel>
              <Select
                label={my_key}
                value={
                  typeof value === "number"
                    ? value
                    : (enum_values.find(
                      (item) =>
                        (typeof value === "string" &&
                          item.mapped === value) ||
                        (typeof value === "number" && item.value === value),
                    )?.value ?? "")
                }
                onChange={(e) => {
                  const selectedValue = e.target.value as number;
                  onValueChange(my_key, selectedValue);
                }}
              >
                {enum_values.map((item) => (
                  <MenuItem key={item.value} value={item.value}>
                    {item.mapped}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          );
        })()
      ) : (
        <Typography color="error">Invalid type: {my_type}</Typography>
      )}
    </FormControl>
  );
}

function getStatusColor2(name: string, vrednost: ParsedSensorValue): string {
  const target = useSensorStore.getState().target_sensor_data;
  if (!target) {
    return "white";
  }
  if (name === "dev_eui" || name === "join_eui" || name === "app_key") {
    return "white";
  }

  for (const [key, value] of Object.entries(target)) {
    if (name === key && value === vrednost) {
      return "white";
    }
  }
  console.log("Name", name, "Vrednost", vrednost, "Target", target);

  return "red";
}
