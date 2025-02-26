"use client";

import { useMemo, useRef, useState } from "react";
import {
  ParsedSensorData,
  ParsedSensorValue,
  // SensorParserCombinator,
} from "./Reader/ParseSensorData";
import { useSensorStore } from "./SensorStore";
import { usePrinterStore } from "./printer/printer_settinsgs_store";
import { connectToPort, readDataFromPort } from "./Reader/HandleClick";

import { Divider, FormControl, Grid2, InputLabel, SelectChangeEvent } from "@mui/material";
import { PrintSticker } from "./printer/printer_server_side";
import {
  Box,
  Button,
  Collapse,
  Typography,
  TextField,
  Checkbox,
  Select,
  MenuItem,
  Paper,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import deepEqual from "deep-equal";
import { useQuery } from "@tanstack/react-query";
import { RightDecoder } from "./Reader/Get_Sensors_database_chace";
import { GetSensors } from "~/app/sensors/components/backend";

type ImportantSensorData = Record<
  string,
  {
    value: ParsedSensorValue;
    my_type: string;
    enum_values?: { value: number; mapped: string }[];
  }
>;

export function SensorCheckForm() {
  // Remove separate useForm; use the context instead.
  const portRef = useRef<SerialPort | null>(null);

  const selectedPrinter = usePrinterStore((state) => state.selectedPrinter);
  const sensor_parsers = useSensorStore((state) => state.current_decoder);
  const [showUnimportantParameters, setShowUnimportantParameters] =
    useState<boolean>(false);

  const current_sensor_index = useSensorStore(
    (state) => state.current_sensor_index
  );

  const current_sensor = useSensorStore((state) => {
    if (state.sensors.length !== 0)
      return state.sensors[state.current_sensor_index];
    else return undefined;
  });

  const all_sensors = useSensorStore((state) => state.sensors);

  const add_new_sensor = useSensorStore((state) => state.add_new_sensor);

  const set_sensor_data = useSensorStore((state) => state.set_sensor_data);

  const set_sensor_status = useSensorStore((state) => state.set_sensor_status);

  const set_current_sensor_index = useSensorStore(
    (state) => state.set_current_sensor_index
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

  const GetDataFromSensor = async () => {
    try {
      if (!portRef.current) {
        portRef.current = await connectToPort();
      } else {
        console.log("Port is already connected.");
      }

      console.log("Port:", portRef.current);
      return readDataFromPort(portRef.current);
    } catch (error) {
      console.error("Failed to handle click:", error);
    }
  };

  const [important_sensor_data, unimportant_sensor_data] = useMemo(() => {
    const important: ImportantSensorData = {};
    const unimportant: ImportantSensorData = {};
    console.log("sensor_parsers", sensor_parsers);
    console.log("current_sensor", current_sensor);
    console.log("Sensor parser: ", sensor_parsers)
    if (!current_sensor) return [important, unimportant];
    Object.entries(current_sensor.data).forEach(([key, value]) => {
      const parser = sensor_parsers.find(
        (parser) => parser.output.name === key
      );

      if (!parser?.output) {
        console.error("Parser not found for key", key);
        return;
      }

      if (parser.output.important) {
        important[key] = {
          value,
          my_type: parser.output.type,
          enum_values: parser.output.enum_values,
        };
      } else {
        unimportant[key] = {
          value,
          my_type: parser.output.type,
          enum_values: parser.output.enum_values,
        };
      }
    });

    return [important, unimportant];
  }, [current_sensor, sensor_parsers]);

  // useEffect(() => {
  //   if (!current_sensor) return;
  //   Object.entries(current_sensor.data).forEach(([key, value]) => {
  //     setValue(key, value);
  //   });
  // }, [current_sensor, setValue]);

  function handleDynamicChange(name: string, value: ParsedSensorValue): void {
    if (!current_sensor) return;
    const new_data = { ...current_sensor.data, [name]: value };
    set_sensor_data(current_sensor_index, new_data);
  }



  function handleSubmit(dataHandler: (data: ParsedSensorData) => Promise<void>): void {
    if (!current_sensor) return;
    dataHandler(current_sensor.data as ParsedSensorData)
      .then(async () => {
        // Use functional update to get the latest index
        set_current_sensor_index(current_sensor_index + 1);
      })
      .catch((error) => {
        console.error("Error in data handler:", error);
      });
  }

  return (
    <Paper elevation={3} sx={{ p: 3, borderRadius: 2 }}>
      <form>
        <Box
          sx={{
            mb: 2,
            p: 3,
            borderRadius: 2,
            backgroundColor: current_sensor
              ? getStatusColor(current_sensor.data.status, current_sensor.data)
              : "white",
            display: "flex",
            flexDirection: "column",
            alignItems: "center", // Center content horizontally
            justifyContent: "center", // Center content vertically
            minHeight: "200px", // Set a minimum height for the main box
            width: "100%", // Take full width
            boxShadow: 3, // Add shadow for better visual appearance
          }}
        >
          <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
            Key Parameters
          </Typography>
          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              gap: 3, // Spacing between parameter boxes
              justifyContent: "center", // Center parameter boxes horizontally
              //maxWidth: '1200px', // Limit maximum width for better centering
              width: "100%", // Take full width of the parent
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
                  minWidth: "200px", // Minimum width for each parameter box
                  textAlign: "center", // Center text inside the box
                  boxShadow: 1, // Subtle shadow for each parameter box
                  "&:hover": {
                    boxShadow: 3, // Enhance shadow on hover
                    transform: "scale(1.05)", // Slightly enlarge on hover
                    transition: "all 0.3s ease", // Smooth transition
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
            <Grid2 container spacing={2} sx={{ mt: 1 }}>
              {Object.entries(unimportant_sensor_data).map(([key, value]) => (
                <Grid2 size={{ xs: 12, sm: 6, md: 4 }} key={key}>
                  <DynamicFormComponent
                    my_key={key}
                    my_type={value.my_type}
                    value={value.value}
                    enum_values={value.enum_values}
                    onValueChange={handleDynamicChange}
                  />
                </Grid2>
              ))}
            </Grid2>
          </Collapse>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
          <Button
            variant="contained"
            color="success"
            onClick={() => {
              handleSubmit(async (data: ParsedSensorData) => {
                try {
                  // Update sensor status and data first
                  set_sensor_status(current_sensor_index, true);
                  set_sensor_data(current_sensor_index, data);

                  // Proceed to print and read new data
                  await PrintSticker(
                    data.dev_eui as string,
                    data.family_id as number,
                    data.product_id as number,
                    selectedPrinter
                  );

                  const uint_array = await GetDataFromSensor();
                  if (!uint_array || !sensors) return;

                  const decoder = RightDecoder(uint_array, sensors);
                  if (!decoder) return;

                  add_new_sensor(decoder, uint_array);
                } catch (error) {
                  console.error("Error in submission:", error);
                  throw error; // Propagate error to handleSubmit's catch
                }
              });
            }}
            sx={{ flex: 1 }}
          >
            Accept
          </Button>

          <Button
            variant="contained"
            color="error"
            href="/konec"
            onClick={async () => {
              //await createFolderAndSpreadsheet();
              set_current_sensor_index(0);
            }}
            sx={{ flex: 1 }}
          >
            Finish
          </Button>

          <Button
            variant="outlined"
            color="warning"
            onClick={() => handleSubmit((data: ParsedSensorData) =>
              onSubmit(data, false)
            )}
            sx={{ flex: 1 }}
          >
            Reject
          </Button>
        </Box>
      </form>
    </Paper>
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
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent<unknown>
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
          />
          <InputLabel>{my_key}</InputLabel>
        </Box>
      ) : my_type === "number" ? (
        <TextField
          label={my_key}
          type="number"
          value={value}
          onChange={handleChange}
        />
      ) : my_type === "string" ? (
        <TextField
          label={my_key}
          value={value}
          onChange={handleChange}
        />
      ) : my_type === "enum" && enum_values ? (
        <Select
          label={my_key}
          value={value}
          onChange={handleChange}
        >
          {enum_values.map((item) => (
            <MenuItem key={item.value} value={item.value}>
              {item.mapped}
            </MenuItem>
          ))}
        </Select>
      ) : (
        <Typography color="error">Invalid type: {my_type}</Typography>
      )}
    </FormControl>
  );
}

function getStatusColor(
  status: ParsedSensorValue,
  current_sensor: ParsedSensorData
) {
  const target = useSensorStore.getState().target_sensor_data;
  if (typeof current_sensor === "undefined" || typeof target === "undefined")
    return "white"; /// hitor iskanje

  const is_equal = deepEqual(target, current_sensor);

  if (is_equal) {
    // TODO: return {color:"green", message: "OK"};
    return "green";
  } else if (!is_equal && (status === 1 || status === 2)) {
    return "yellow";
  } else {
    return "red";
  }
}
