"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type {
  ParsedSensorData,
  ParsedSensorValue,
  //ParseSensorData,
} from "./Reader/ParseSensorData";
import { Dialog, DialogActions, DialogContent, DialogTitle, List, ListItem, ListItemText, Dialog as MismatchDialog } from "@mui/material";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { useSensorStore } from "./SensorStore";
import { usePrinterStore } from "./printer/printer_settinsgs_store";
//import { EncodeSensorData } from "./Reader/WriteSensorData";
import Image from "next/image";
import {
  checkPortStatus,
  connectToPort,
  getOperationStatus,
  readDataFromPort,
  resetOperationFlags,
  //writeDataToPort,
} from "./Reader/HandleClick";
//import { convertSensorDataToBytes, validateSensorData, verifyConversion, compareOriginalWithReadback, debugConversionFlow, analyzeParserConfiguration, normalizeSensorData, detailedDataComparison, displayDetailedConversion, validateParserConfiguration, checkDecoderMatch, validateByteData, suggestSensorWriteFixes, checkSensorProtocol, generateDiagnosticReport } from "./ReprogramSensor";
import { Alert } from "@mui/material";
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
import { Grid } from "@mui/material";

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
import { getZplForSensor } from "src/app/dev/components/Reader/Get_Sensors_database_chace"
import { RightDecoder } from "./Reader/Get_Sensors_database_chace";
import { GetSensors } from "~/app/sensors/components/backend";
import type { Senzor } from "@prisma/client";
import { insertIntoDB, type ProductionListWithoutId } from "./PrismaCode";
import Printer_settings from "./printer/Printer_settings";
//import { logOut } from "~/server/LOGIN_LUCIA_ACTION/auth-action";
import { getCurrentSession } from "~/server/LOGIN_LUCIA_ACTION/session";
//import { removeComponentsFromStockForSensor } from "~/app/inventory/components/backent"; // Konfiguracija za avtomatsko odštevanje komponent
import { SerialPortPicker } from "src/app/dev/components/Reader/SerialPortPicker";
import { checkDevEuiExists } from "./PrismaCode";
//import type { Sensor } from "~/app/parametrs/components/functions";
// TODO: To bi lahko bilo shranjen v localStorage ali backend nastavitvah
// const getAutoDeductComponents = (): boolean => {
//   if (typeof window !== "undefined") {
//     const stored = localStorage.getItem("autoDeductComponents");
//     return stored !== null ? JSON.parse(stored) : true; // privzeto omogočeno
//   }
//   return true;
// };
function normalizeNumber(n: number): number {
  return Math.round(n * 1000) / 1000; // odpravi floating point šum na 3 decimalke
}

function resolveEnumValue(
  value: ParsedSensorValue,
  enumValues: { value: number; mapped: string }[],
): number | undefined {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    return enumValues.find((e) => e.mapped === value)?.value;
  }
  return undefined;
}

function isFieldMismatch(
  name: string,
  value: ParsedSensorValue,
  target: Record<string, ParsedSensorValue> | undefined,
  parser?: {
    output: {
      type: string;
      enum_values?: { value: number; mapped: string }[];
      tolerance?: boolean;
      from?: number;
      upTo?: number;
    };
  },
): boolean {
  if (
    name === "dev_eui" ||
    name === "join_eui" ||
    name === "app_key" ||
    name === "app_eui"
  ) {
    return false;
  }

  // Polja z dovoljenim razponom (npr. temperatura 0-50°C) - preveri, ali je
  // vrednost ZNOTRAJ razpona, NEODVISNO od target_sensor_data. Ta polja
  // nimajo ene "pravilne" vrednosti, ampak celoten fizikalno smiseln razpon.
  if (
    parser?.output.tolerance &&
    typeof value === "number" &&
    parser.output.from !== undefined &&
    parser.output.upTo !== undefined
  ) {
    return value < parser.output.from || value > parser.output.upTo;
  }

  // Za vsa ostala polja - primerjaj proti target_sensor_data kot doslej
  if (!target) return false;
  const targetValue = target[name];
  if (targetValue === undefined) return false;

  if (parser?.output.type === "enum" && parser.output.enum_values) {
    const resolvedTarget = resolveEnumValue(targetValue, parser.output.enum_values);
    const resolvedActual = resolveEnumValue(value, parser.output.enum_values);
    return resolvedTarget !== resolvedActual;
  }

  if (typeof value === "number" && typeof targetValue === "number") {
    return normalizeNumber(value) !== normalizeNumber(targetValue);
  }

  return targetValue !== value;
}

// const setAutoDeductComponents = (enabled: boolean): void => {
//   if (typeof window !== "undefined") {
//     localStorage.setItem("autoDeductComponents", JSON.stringify(enabled));
//   }
// };

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

  // State for USB connection feedback
  const [usbStatus, setUsbStatus] = useState<{
    isConnecting: boolean;
    message: string;
    type: "info" | "success" | "warning" | "error";
  }>({
    isConnecting: false,
    message: "",
    type: "info",
  });

  // State za avtomatsko odštevanje komponent
  // const [autoDeductComponents, setAutoDeductComponentsState] =
  //   useState<boolean>(() => getAutoDeductComponents());

  // // State for button processing
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingMessage, setProcessingMessage] = useState<string>("");

  // Funkcija za posodabljanje nastavitve
  // const updateAutoDeductComponents = (enabled: boolean) => {
  //   setAutoDeductComponentsState(enabled);
  //   setAutoDeductComponents(enabled);
  // };



  // function getZplForSensor(devEui: string): string {
  //   return ZPL_TEMPLATE.replace(/{{DEV_EUI}}/g, devEui);
  // }

  async function PrintSticker(

    dev_eui: string,
    sensors: Senzor[],
    family_id: number,
    product_id: number,
    frequency: string,
  ): Promise<{ success: boolean; message: string }> {
    if (!window.electronAPI) {
      return {
        success: false,
        message: "Tiskanje je na voljo samo v namizni aplikaciji.",
      };
    }
    if (!selectedPrinter) {
      return { success: false, message: "Tiskalnik ni izbran." };
    }

    const zpl = getZplForSensor(dev_eui, sensors, family_id, product_id, frequency);

    try {
      await window.electronAPI.printZpl(selectedPrinter, zpl);
      return { success: true, message: "Nalepka natisnjena." };
    } catch (err) {
      return {
        success: false,
        message: `Napaka pri tiskanju: ${(err as Error).message}`,
      };
    }
  }

  // Auto-clear USB status messages after 5 seconds
  useEffect(() => {
    if (usbStatus.message && !usbStatus.isConnecting) {
      const timer = setTimeout(() => {
        setUsbStatus((prev) => ({ ...prev, message: "" }));
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [usbStatus.message, usbStatus.isConnecting]);
  const orderId = useSensorStore((state) => state.OrderID);
  const [sessionDuplicateWarningOpen, setSessionDuplicateWarningOpen] = useState(false);
  const [sessionDuplicateResolveRef, setSessionDuplicateResolveRef] = useState<
    ((proceed: boolean) => void) | null
  >(null);
  const target_sensor_data = useSensorStore(
    (state) => state.target_sensor_data,
  );
  const current_sensor_index = useSensorStore(
    (state) => state.current_sensor_index,
  );
  const [mismatchDialogOpen, setMismatchDialogOpen] = useState(false);
  const [mismatchList, setMismatchList] = useState<{ name: string; expected: ParsedSensorValue; actual: ParsedSensorValue }[]>([]);
  const current_sensor = useSensorStore((state) => {
    if (state.sensors.length !== 0)
      return state.sensors[state.current_sensor_index];
    else return undefined;
  });
  const checkedIndicesRef = useRef<Set<number>>(new Set());
  const [duplicateWarningOpen, setDuplicateWarningOpen] = useState(false);
  const [duplicateResolveRef, setDuplicateResolveRef] = useState<
    ((shouldPrint: boolean) => void) | null
  >(null);
  useEffect(() => {
    if (!current_sensor || !target_sensor_data) return;

    // Preveri vsak senzor SAMO ENKRAT v celotni seji (po indeksu) -
    // Set namesto ene vrednosti, ker se current_sensor_index lahko
    // resetira nazaj na 0 (npr. ob kliku "Končaj"), kar bi sicer
    // sprožilo ponoven, napačen prikaz mismatch dialoga za prvi senzor.
    if (checkedIndicesRef.current.has(current_sensor_index)) return;
    checkedIndicesRef.current.add(current_sensor_index);

    const mismatches: {
      name: string;
      expected: ParsedSensorValue;
      actual: ParsedSensorValue;
    }[] = [];

    Object.entries(current_sensor.data).forEach(([key, value]) => {
      if (key.endsWith("_tol")) return;

      const parser = sensor_parsers.find((p) => p.output.name === key);

      if (
        isFieldMismatch(
          key,
          value as ParsedSensorValue,
          target_sensor_data,
          parser,
        )
      ) {
        let displayExpected = target_sensor_data[key];

        if (parser?.output.type === "enum" && parser.output.enum_values) {
          const mapped = parser.output.enum_values.find(
            (e) => e.value === displayExpected,
          );
          if (mapped) displayExpected = mapped.mapped;
        }

        mismatches.push({
          name: key,
          expected: displayExpected,
          actual: value as ParsedSensorValue,
        });
      }
    });

    if (mismatches.length > 0) {
      setMismatchList(mismatches);
      setMismatchDialogOpen(true);
    }
  }, [current_sensor_index, current_sensor, target_sensor_data, sensor_parsers]);

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
      return data.map((sensor: Senzor) => ({
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

    console.log("onSubmit completed - no automatic sensor reading");
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

  useEffect(() => {
    useSensorStore.setState({ start_time: Date.now() });
  }, []);

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

      // Get addToStock flag from target_sensor_data
      const addToStock = target_sensor_data?.addToStock ?? false;

      // Determine orderId based on addToStock state
      // If addToStock is true (meaning we DO want to add to stock inventory), use null for orderId
      // If addToStock is false (meaning we DON'T want to add to stock inventory), use the orderId from store
      const finalOrderId = addToStock ? null : orderId;
      console.log(
        "Using orderId:",
        finalOrderId,
        "(addToStock:",
        addToStock,
        ")",
      );

      return insertIntoDB(dataforDB, finalOrderId);
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
      console.log("No current sensor available");
      return;
    }

    try {
      await dataHandler(current_sensor.data as ParsedSensorData);
      set_sensor_data(
        current_sensor_index,
        current_sensor.data as ParsedSensorData,
      );
      console.log("Data handler completed successfully");
    } catch (error) {
      console.error("Error in data handler:", error);
    }
  }

  return (
    <>
      <AppBar position="static" color="default" elevation={1}>
        <Container maxWidth={false}>
          <Toolbar disableGutters sx={{ gap: 2 }}>
            <Image
              src="/senzemo-logo.svg"
              alt="Senzemo"
              width={110}
              height={30}
              priority
            />
            <SerialPortPicker />

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
                disabled={usbStatus.isConnecting}
                onClick={async () => {
                  console.log("USB connection button clicked - SIMPLE MODE");

                  setUsbStatus({
                    isConnecting: true,
                    message: "Povezovanje z bralnikom...",
                    type: "info",
                  });

                  try {
                    // Preprosta logika: povežeš, prebereš, počakaš, prebereš ponovno

                    // 1. Povežeš se z bralnikom
                    console.log("1. Connecting to reader...");
                    resetOperationFlags();

                    if (!portRef.current) {
                      portRef.current = await connectToPort();
                    }

                    // 2. Prebereš podatke
                    console.log("2. Reading data from sensor...");
                    const uint_array = await GetDataFromSensor();

                    if (!uint_array || !sensors) {
                      setUsbStatus({
                        isConnecting: false,
                        message: "Ni podatkov iz bralnika",
                        type: "error",
                      });
                      return;
                    }

                    console.log("Raw data received:", uint_array);

                    // 3. Počakaš da se vse validira (decoder)
                    console.log("3. Validating and finding decoder...");
                    const decoder = RightDecoder(uint_array, sensors);
                    console.log("Decoder found:", decoder);
                    if (!decoder) {
                      setUsbStatus({
                        isConnecting: false,
                        message: "Neznana vrsta senzorja",
                        type: "error",
                      });
                      return;
                    }

                    // 4. Dodaš senzor
                    console.log("4. Adding sensor to store...");
                    const wasAlreadyAccepted862 = await add_new_sensor(decoder, uint_array);
                    setUsbStatus({
                      isConnecting: false,
                      message: wasAlreadyAccepted862
                        ? "OPOZORILO: Ta senzor je bil že sprejet v tej seji!"
                        : "Senzor uspešno prebran",
                      type: wasAlreadyAccepted862 ? "warning" : "success",
                    });
                    console.log("Simple read cycle completed successfully");
                    // add_new_sensor(decoder, uint_array);

                    setUsbStatus({
                      isConnecting: false,
                      message: "Senzor uspešno prebran",
                      type: "success",
                    });

                    console.log("Simple read cycle completed successfully");
                  } catch (error) {
                    console.error("Error in simple read cycle:", error);
                    setUsbStatus({
                      isConnecting: false,
                      message: "Napaka pri branju senzorja",
                      type: "error",
                    });
                  }
                }}
                variant="contained"
                sx={{ px: 3 }}
              >
                {usbStatus.isConnecting
                  ? "Povezovanje..."
                  : "Povezava z bralnikom"}
              </Button>

              {/* Status message display */}
              {/* {usbStatus.message && (
                <Box
                  sx={{
                    ml: 2,
                    px: 2,
                    py: 1,
                    backgroundColor:
                      usbStatus.type === "success"
                        ? "success.light"
                        : usbStatus.type === "warning"
                          ? "warning.light"
                          : usbStatus.type === "error"
                            ? "error.light"
                            : "info.light",
                    color: "white",
                    borderRadius: 1,
                    fontSize: "0.875rem",
                    fontWeight: "bold",
                  }}
                >
                  {usbStatus.message}
                </Box>
              )} */}
              {usbStatus.message && (
                <Alert severity={usbStatus.type} sx={{ ml: 2, py: 0 }}>
                  {usbStatus.message}
                </Alert>
              )}
            </Box>
            <Box sx={{ flexGrow: 0, display: "flex", alignItems: "center" }}>
              {/* Indikator za auto-deduct nastavitev
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
                  {autoDeductComponents
                    ? "Samodejno odštevanje VKLOPLJENO"
                    : "Samodejno odštevanje IZKLOPLJENO"}
                </Typography>
              </Box> */}

              <Tooltip title="Odpri nastavitve">
                <IconButton onClick={handleOpenUserMenu} sx={{ p: 0 }}>
                  <Avatar alt="User Avatar" src={session.data?.user?.image ?? undefined} />
                </IconButton>
              </Tooltip>
              <Typography sx={{ ml: 1, color: "black" }}>
                {session?.data?.user?.name ?? "Uporabnik"}
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
                  {/* <Typography sx={{ textAlign: "center", color: "black" }}>
                    Račun
                  </Typography> */}
                </MenuItem>

                {/* <MenuItem
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
                      Samodejno odštevanje komponent
                    </Typography>
                  </Box>
                </MenuItem> */}
                <MenuItem
                  onClick={() => {
                    setAddToInv(!AddToInv);
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Checkbox
                      checked={AddToInv}
                      onChange={(e) => setAddToInv(e.target.checked)}
                      size="small"
                    />
                    <Typography sx={{ textAlign: "center", color: "black" }}>
                      Ne dodaj v zalogo
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
                    Nastavitve tiskalnika
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

                {/* <MenuItem
                  onClick={async () => {
                    handleCloseUserMenu();
                    await logOut();
                  }}
                >
                  <Typography sx={{ textAlign: "center", color: "black" }}>
                    Odjava
                  </Typography>
                </MenuItem> */}
              </Menu>
            </Box>
          </Toolbar>
        </Container>
      </AppBar>
      <Box sx={{ maxWidth: 960, mx: "auto", px: { xs: 2, md: 3 }, py: 3 }}>
        <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
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
                Ključni parametri
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
                {showUnimportantParameters
                  ? "Skrij podrobnosti"
                  : "Prikaži podrobnosti"}
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
                  disabled={isProcessing}
                  onClick={async () => {
                    console.log("Accept button clicked");
                    console.log("Current sensor index:", current_sensor_index);

                    if (isProcessing) {
                      console.log("Already processing, ignoring click");
                      return;
                    }

                    setIsProcessing(true);
                    setProcessingMessage("Preverjam podatke...");

                    try {
                      if (!current_sensor) {
                        console.log("No current sensor available");
                        setProcessingMessage("Ni trenutnega senzorja");
                        setTimeout(() => {
                          setIsProcessing(false);
                          setProcessingMessage("");
                        }, 2000);
                        return;
                      }

                      // Validate required data
                      const data = current_sensor.data as ParsedSensorData;
                      if (!data.dev_eui) {
                        console.error("DevEUI is missing");
                        setProcessingMessage("Napaka: Manjka DevEUI");
                        setTimeout(() => {
                          setIsProcessing(false);
                          setProcessingMessage("");
                        }, 2000);
                        return;
                      }

                      // PRVA preverba: je senzor ŽE V TRENUTNI SEJI (napaka
                      // uporabnika - isti senzor bi šel v CSV/Drive DVAKRAT
                      // v istem izvozu, ker ga je po pomoti skeniral dvakrat)
                      const inCurrentSession = all_sensors.some(
                        (sensor, index) =>
                          index !== current_sensor_index &&
                          sensor.okay &&
                          sensor.data.dev_eui === data.dev_eui,
                      );

                      if (inCurrentSession) {
                        const proceedAnyway = await new Promise<boolean>(
                          (resolve) => {
                            setSessionDuplicateResolveRef(() => resolve);
                            setSessionDuplicateWarningOpen(true);
                          },
                        );

                        if (!proceedAnyway) {
                          // Uporabnik je preklical - senzor OSTANE
                          // neobdelan, ni side-effectov
                          setIsProcessing(false);
                          setProcessingMessage("");
                          return;
                        }
                        // Če je uporabnik VSEENO potrdil, nadaljuje naprej
                        // (redek, eksplicitno potrjen primer)
                      }

                      // DRUGA preverba: je senzor bil ŽE PREJ sprejet V BAZI
                      // (legitimen scenarij - senzor iz zaloge, vprašaj za
                      // ponovno tiskanje nalepke)
                      setProcessingMessage("Preverjam podvajanje...");
                      const alreadyInDb = await checkDevEuiExists(
                        data.dev_eui as string,
                      );
                      let shouldPrint = true;

                      if (alreadyInDb) {
                        shouldPrint = await new Promise<boolean>((resolve) => {
                          setDuplicateResolveRef(() => resolve);
                          setDuplicateWarningOpen(true);
                        });

                        if (shouldPrint === null) {
                          // Uporabnik je preklical celotno akcijo
                          setIsProcessing(false);
                          setProcessingMessage("");
                          return;
                        }
                      }

                      console.log("Processing accept for current sensor");
                      setProcessingMessage("Shranjujem v bazo...");

                      // Set sensor status to accepted
                      set_sensor_status(current_sensor_index, true);
                      set_sensor_data(current_sensor_index, data);
                      console.log(
                        "Sensor marked as accepted for index:",
                        current_sensor_index,
                      );

                      // Insert current sensor data into database
                      console.log(
                        "Inserting current sensor data into database...",
                      );
                      try {
                        await insertIntoDatabaseMutation.mutateAsync();
                      } catch (dbError) {
                        console.error("Database insertion failed:", dbError);
                        setProcessingMessage("Napaka pri shranjevanju v bazo");
                        setTimeout(() => {
                          setIsProcessing(false);
                          setProcessingMessage("");
                        }, 3000);
                        return;
                      }

                      // Odštej komponente iz zaloge po uspešni vstavitvi v bazo
                      // Preverimo, ali je avtomatsko odštevanje omogočeno
                      // if (autoDeductComponents) {
                      //   setProcessingMessage("Odštevam komponente...");
                      //   // Najprej poišči sensorId na podlagi family_id in product_id
                      //   const familyId = current_sensor.data.family_id as number;
                      //   const productId = current_sensor.data
                      //     .product_id as number;

                      //   if (familyId && productId && GetSensorName.data) {
                      //     const foundSensor = GetSensorName.data.find(
                      //       (sensor: {
                      //         id: number;
                      //         familyId: number;
                      //         productId: number;
                      //         sensorName: string;
                      //       }) =>
                      //         sensor.familyId === familyId &&
                      //         sensor.productId === productId,
                      //     );

                      //     if (foundSensor) {
                      //       try {
                      //         console.log(
                      //           `Removing components from stock for sensor ID: ${foundSensor.id} (${foundSensor.sensorName})`,
                      //         );
                      //         await removeComponentsFromStockForSensor(
                      //           foundSensor.id,
                      //         );
                      //         console.log(
                      //           "Components successfully removed from stock",
                      //         );
                      //       } catch (componentError) {
                      //         console.error(
                      //           "Error removing components from stock:",
                      //           componentError,
                      //         );
                      //         setProcessingMessage(
                      //           "Opozorilo: Komponente niso bile odštete",
                      //         );
                      //         // Ne prekini procesa, samo logiraj napako
                      //         // Uporabnik lahko nadaljuje z delom, čeprav komponente niso bile odštete
                      //       }
                      //     } else {
                      //       console.warn(
                      //         `Sensor not found for familyId: ${familyId}, productId: ${productId}`,
                      //       );
                      //       setProcessingMessage(
                      //         "Opozorilo: Senzor ni najden v bazi",
                      //       );
                      //     }
                      //   } else {
                      //     console.warn(
                      //       "Missing familyId, productId, or sensor data for component removal",
                      //     );
                      //     setProcessingMessage(
                      //       "Opozorilo: Manjkajo podatki za odštevanje",
                      //     );
                      //   }
                      // } else {
                      //   console.log(
                      //     "Auto-deduct components is disabled, skipping component removal",
                      //   );
                      // }

                      // Pogojno tiskanje - preskoči, če je uporabnik za
                      // podvojen DevEUI izbral "Nadaljuj BREZ tiskanja nalepke"
                      if (shouldPrint) {
                        setProcessingMessage("Tiskam nalepko...");
                        try {
                          await PrintSticker(
                            data.dev_eui as string,
                            sensors ?? [],
                            data.family_id as number,
                            data.product_id as number,
                            data.frequency_region as string,
                          );
                        } catch (printError) {
                          console.error("Error printing sticker:", printError);
                          setProcessingMessage("Opozorilo: Napaka pri tiskanju");
                          // Continue execution even if printing fails
                        }
                      }

                      console.log("Sensor processing completed.");
                      setProcessingMessage("Berem naslednji senzor...");

                      // Avtomatsko preberi naslednji senzor
                      try {
                        console.log("Auto-reading next sensor...");
                        const uint_array = await GetDataFromSensor();

                        if (uint_array && sensors) {
                          const decoder = RightDecoder(uint_array, sensors);
                          if (decoder) {
                            console.log("Auto-adding next sensor...");
                            const wasAlreadyAccepted1368 = await add_new_sensor(decoder, uint_array);
                            setProcessingMessage(
                              wasAlreadyAccepted1368
                                ? "OPOZORILO: Naslednji senzor je bil ŽE SPREJET v tej seji!"
                                : "Senzor uspešno obdelan",
                            );
                          } else {
                            console.log("No decoder found for auto-read sensor");
                            setProcessingMessage("Naslednji senzor ni prepoznan");
                          }
                        } else {
                          console.log("No data from auto-read");
                          setProcessingMessage("Ni podatkov iz bralnika");
                        }
                      } catch (autoReadError) {
                        console.log(
                          "Auto-read failed (user can manually read):",
                          autoReadError,
                        );
                        setProcessingMessage(
                          "Senzor obdelan - ročno preberite naslednjega",
                        );
                        // Ne prikaži napake - uporabnik lahko ročno prebere naslednji senzor
                      }
                    } catch (error) {
                      console.error("Error in accept button:", error);
                      setProcessingMessage("Napaka pri obdelavi senzorja");

                      // Reset flags on error to prevent getting stuck
                      resetOperationFlags();
                    } finally {
                      // Always reset processing state
                      setTimeout(() => {
                        setIsProcessing(false);
                        setProcessingMessage("");
                      }, 3000); // Show final message for 3 seconds
                    }
                  }}
                  sx={{ flex: 1 }}
                >
                  {isProcessing ? "Obdelujem..." : "Sprejmi"}
                </Button>
              </Box>
            ) : (
              <Box
                sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}
              >
                <Button
                  variant="contained"
                  color="info"
                  disabled={isProcessing}
                  onClick={async () => {
                    console.log("Don't add to inventory button clicked");
                    console.log("Current sensor index:", current_sensor_index);

                    if (isProcessing) {
                      console.log("Already processing, ignoring click");
                      return;
                    }

                    setIsProcessing(true);
                    setProcessingMessage("Preverjam podatke...");

                    try {
                      if (!current_sensor) {
                        console.log("No current sensor available");
                        setProcessingMessage("Ni trenutnega senzorja");
                        setTimeout(() => {
                          setIsProcessing(false);
                          setProcessingMessage("");
                        }, 2000);
                        return;
                      }

                      // Validate required data
                      const data = current_sensor.data as ParsedSensorData;
                      if (!data.dev_eui) {
                        console.error("DevEUI is missing");
                        setProcessingMessage("Napaka: Manjka DevEUI");
                        setTimeout(() => {
                          setIsProcessing(false);
                          setProcessingMessage("");
                        }, 2000);
                        return;
                      }

                      console.log(
                        "Processing don't add to inventory for current sensor",
                      );
                      setProcessingMessage("Shranjevam v store...");

                      // Set sensor status to accepted (but won't add to database)
                      set_sensor_status(current_sensor_index, true);
                      set_sensor_data(current_sensor_index, data);
                      console.log(
                        "Sensor marked as accepted (store only) for index:",
                        current_sensor_index,
                      );

                      // Skip database insertion - only store in state
                      console.log(
                        "Skipping database insertion - storing in store only",
                      );

                      setProcessingMessage("Tiskam nalepko...");
                      // Print sticker if needed
                      try {
                        await PrintSticker(
                          data.dev_eui as string,
                          sensors ?? [],
                          data.family_id as number,
                          data.product_id as number,
                          data.frequency_region as string
                        );
                      } catch (printError) {
                        console.error("Error printing sticker:", printError);
                        setProcessingMessage("Opozorilo: Napaka pri tiskanju");
                        // Continue execution even if printing fails
                      }

                      console.log("Sensor processing completed.");
                      setProcessingMessage("Berem naslednji senzor...");

                      // Avtomatsko preberi naslednji senzor
                      try {
                        console.log("Auto-reading next sensor...");
                        const uint_array = await GetDataFromSensor();

                        if (uint_array && sensors) {
                          const decoder = RightDecoder(uint_array, sensors);
                          if (decoder) {
                            console.log("Auto-adding next sensor...");
                            const wasAlreadyAccepted1496 = await add_new_sensor(decoder, uint_array);
                            setProcessingMessage(
                              wasAlreadyAccepted1496
                                ? "OPOZORILO: Naslednji senzor je bil ŽE SPREJET v tej seji!"
                                : "Senzor uspešno obdelan (brez inventarja)",
                            );
                          } else {
                            console.log("No decoder found for auto-read sensor");
                            setProcessingMessage("Naslednji senzor ni prepoznan");
                          }
                        } else {
                          console.log("No data from auto-read");
                          setProcessingMessage("Ni podatkov iz bralnika");
                        }
                      } catch (autoReadError) {
                        console.log(
                          "Auto-read failed (user can manually read):",
                          autoReadError,
                        );
                        setProcessingMessage(
                          "Senzor obdelan - ročno preberite naslednjega",
                        );
                        // Ne prikaži napake - uporabnik lahko ročno prebere naslednji senzor
                      }
                    } catch (error) {
                      console.error(
                        "Error in don't add to inventory button:",
                        error,
                      );
                      setProcessingMessage("Napaka pri obdelavi senzorja");

                      // Reset flags on error to prevent getting stuck
                      resetOperationFlags();
                    } finally {
                      // Always reset processing state
                      setTimeout(() => {
                        setIsProcessing(false);
                        setProcessingMessage("");
                      }, 3000); // Show final message for 3 seconds
                    }
                  }}
                  sx={{ flex: 1 }}
                >
                  {isProcessing ? "Obdelujem..." : "Sprejmi brez inventarja"}
                </Button>
              </Box>
            )}

            {/* Processing status message */}
            {processingMessage && (
              <Box
                sx={{
                  mt: 2,
                  p: 2,
                  backgroundColor: isProcessing
                    ? "info.light"
                    : processingMessage.includes("Napaka") ||
                      processingMessage.includes("Opozorilo")
                      ? "warning.light"
                      : "success.light",
                  color: "white",
                  borderRadius: 1,
                  textAlign: "center",
                  fontSize: "0.875rem",
                  fontWeight: "bold",
                }}
              >
                {processingMessage}
              </Box>
            )}

            <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
              {/* <Button
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
              Reprogramiraj
            </Button> */}
              <Button
                variant="outlined"
                color="warning"
                onClick={() =>
                  handleSubmit((data: ParsedSensorData) => onSubmit(data, false))
                }
                sx={{ flex: 1 }}
              >
                Zavrni
              </Button>
            </Box>

            <Box sx={{ display: "flex", justifyContent: "center", mt: 3, }}>
              <Button
                variant="contained"
                color="error"
                href="/konec"
                onClick={async () => {
                  //await createFolderAndSpreadsheet();
                  useSensorStore.setState({ end_time: Date.now() });
                  set_current_sensor_index(0);
                }}
                sx={{ flex: 1 }}
              >
                Končaj
              </Button>
            </Box>
          </form>
        </Paper>
      </Box>

      <MismatchDialog
        open={mismatchDialogOpen}
        onClose={() => { }}
        disableEscapeKeyDown
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <WarningAmberIcon color="warning" />
          Neujemajoči podatki
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Naslednje vrednosti se ne ujemajo s pričakovanimi:
          </Typography>
          <List dense>
            {mismatchList.map((m) => (
              <ListItem
                key={m.name}
                sx={{ borderBottom: "1px solid", borderColor: "divider" }}
              >
                <ListItemText
                  primary={m.name}
                  secondary={`Pričakovano: ${m.expected}  →  Dejansko: ${m.actual}`}
                  slotProps={{ secondary: { color: "error" } }}
                />
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button
            variant="contained"
            onClick={() => setMismatchDialogOpen(false)}
            autoFocus
          >
            V redu, razumem
          </Button>
        </DialogActions>
      </MismatchDialog>
      <Dialog
        open={duplicateWarningOpen}
        onClose={() => { }}
        disableEscapeKeyDown
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <WarningAmberIcon color="error" />
          Senzor je že bil skeniran!
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            Senzor s tem DevEUI (
            <strong>{current_sensor?.data.dev_eui as string}</strong>) je{" "}
            <strong>že bil sprejet</strong> v preteklosti. Obstoječ zapis v bazi{" "}
            <strong>ne bo podvojen</strong> — sistem bo uporabil obstoječ zapis.
          </Typography>
          <Typography variant="body2" sx={{ mb: 3 }}>
            Ali želiš ponovno natisniti nalepko za ta senzor?
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <Button
              variant="contained"
              color="warning"
              onClick={() => {
                setDuplicateWarningOpen(false);
                duplicateResolveRef?.(true);
              }}
            >
              Nadaljuj IN ponovno natisni nalepko
            </Button>
            <Button
              variant="outlined"
              color="warning"
              onClick={() => {
                setDuplicateWarningOpen(false);
                duplicateResolveRef?.(false);
              }}
            >
              Nadaljuj BREZ tiskanja nalepke
            </Button>
            <Button
              variant="text"
              onClick={() => {
                setDuplicateWarningOpen(false);
                duplicateResolveRef?.(null as unknown as boolean);
              }}
            >
              Prekliči celotno akcijo
            </Button>
          </Box>
        </DialogContent>
      </Dialog>
      <Dialog
        open={sessionDuplicateWarningOpen}
        onClose={() => { }}
        disableEscapeKeyDown
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <WarningAmberIcon color="error" />
          Senzor je že v trenutnem seznamu!
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            Senzor s tem DevEUI (
            <strong>{current_sensor?.data.dev_eui as string}</strong>) je{" "}
            <strong>že sprejet</strong> v tej seji in bo poslan na Drive/CSV.
            Če nadaljuješ, bo ta senzor <strong>DVAKRAT</strong> v izvozu.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            To je verjetno pomota (isti senzor si po nesreči skeniral dvakrat).
          </Typography>
          <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
            <Button
              variant="outlined"
              onClick={() => {
                setSessionDuplicateWarningOpen(false);
                sessionDuplicateResolveRef?.(false);
              }}
            >
              Prekliči (priporočeno)
            </Button>
            <Button
              variant="contained"
              color="error"
              onClick={() => {
                setSessionDuplicateWarningOpen(false);
                sessionDuplicateResolveRef?.(true);
              }}
            >
              Vseeno dodaj
            </Button>
          </Box>
        </DialogContent>
      </Dialog>
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
        <Box sx={{ display: "flex", alignItems: "center" }}>
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
            case "AS923": primerjator = 0; break;
            case "AU915": primerjator = 1; break;
            case "CN470": primerjator = 2; break;
            case "CN779": primerjator = 3; break;
            case "EU433": primerjator = 4; break;
            case "EU868": primerjator = 5; break;
            case "KR920": primerjator = 6; break;
            case "IN865": primerjator = 7; break;
            case "US915": primerjator = 8; break;
            case "RU864": primerjator = 9; break;
            default: break;
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
        <Typography color="error">
          Neveljaven tip: deklariran tip=&quot;{my_type}&quot;, dejanski JS tip
          vrednosti={typeof value}, ime polja={my_key}, vrednost=
          {JSON.stringify(value)}
        </Typography>
      )}
    </FormControl>
  );
}
function getStatusColor2(name: string, vrednost: ParsedSensorValue): string {
  const target = useSensorStore.getState().target_sensor_data;
  const decoder = useSensorStore.getState().current_decoder;
  const parser = decoder?.find((p) => p.output.name === name);
  return isFieldMismatch(name, vrednost, target, parser) ? "red" : "white";
}