"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ParsedSensorData,
  ParsedSensorValue,
  // SensorParserCombinator,
} from "./Reader/ParseSensorData";
import { useSensorStore } from "./SensorStore";
import { usePrinterStore } from "./printer/printer_settinsgs_store";
import { useForm } from "react-hook-form";
import { connectToPort, readDataFromPort } from "./Reader/HandleClick";

import { Divider } from "@mui/material";
import { PrintSticker } from "./printer/printer_server_side";
import {
  Box,
  Button,
  Collapse,
  Grid,
  Typography,
  TextField,
  Checkbox,
  FormControlLabel,
  Select,
  MenuItem,
  Paper
} from "@mui/material";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

export function SensorCheckForm(//{
  // parsed_sensor_data,
  //sensor_parsers, sensor parser se lahko spreminja in  app
  // }: {
  //   // parsed_sensor_data: ParsedSensorData;
  //   sensor_parsers: SensorParserCombinator;
  // }
) {
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

  const sensor_form_api = useForm<ParsedSensorData>();

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

    sensor_form_api.reset();

    // set_current_sensor_index(current_sensor_index + 1);
    const uint_array = await GetDataFromSensor();
    if (!uint_array) return;
    add_new_sensor(uint_array);
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
    const important: Record<string, ParsedSensorValue> = {};
    const unimportant: Record<string, ParsedSensorValue> = {};
    console.log("sensor_parsers", sensor_parsers);
    console.log("current_sensor", current_sensor);


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
        important[key] = value;
      } else {
        unimportant[key] = value;
      }
    });

    return [important, unimportant];
  }, [current_sensor, sensor_parsers]);

  useEffect(() => {
    if (!current_sensor) return;
    Object.entries(current_sensor.data).forEach(([key, value]) => {
      sensor_form_api.setValue(key, value);
    });
  }, [current_sensor, sensor_form_api]);

  return (
    <Paper elevation={3} sx={{ p: 3, borderRadius: 2 }}>
      <form>
        <Box
          sx={{
            mb: 2,
            p: 3,
            borderRadius: 2,
            backgroundColor: current_sensor ? getStatusColor(current_sensor.data.status, current_sensor.data) : "white",
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center', // Center content horizontally
            justifyContent: 'center', // Center content vertically
            minHeight: '200px', // Set a minimum height for the main box
            width: '100%', // Take full width
            boxShadow: 3, // Add shadow for better visual appearance
          }}
        >
          <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
            Key Parameters
          </Typography>
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 3, // Spacing between parameter boxes
              justifyContent: 'center', // Center parameter boxes horizontally
              //maxWidth: '1200px', // Limit maximum width for better centering
              width: '100%', // Take full width of the parent
            }}
          >
            {Object.entries(important_sensor_data).map(([key, value]) => (
              <Box
                key={key}
                sx={{
                  p: 2,
                  borderRadius: 2,
                  backgroundColor: 'background.paper',
                  border: '1px solid',
                  borderColor: 'divider',
                  minWidth: '200px', // Minimum width for each parameter box
                  textAlign: 'center', // Center text inside the box
                  boxShadow: 1, // Subtle shadow for each parameter box
                  '&:hover': {
                    boxShadow: 3, // Enhance shadow on hover
                    transform: 'scale(1.05)', // Slightly enlarge on hover
                    transition: 'all 0.3s ease', // Smooth transition
                  },
                }}
              >
                <DynamicFormComponent my_key={key} value={value} />
              </Box>
            ))}
          </Box>
        </Box>

        <Box sx={{ mb: 2 }}>
          <Button
            variant="text"
            size="small"
            endIcon={showUnimportantParameters ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            onClick={() => setShowUnimportantParameters(!showUnimportantParameters)}
          >
            {showUnimportantParameters ? 'Hide Details' : 'Show Details'}
          </Button>

          <Collapse in={showUnimportantParameters}>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              {Object.entries(unimportant_sensor_data).map(([key, value]) => (
                <Grid item xs={12} sm={6} md={4} key={key}>
                  <DynamicFormComponent my_key={key} value={value} />
                </Grid>
              ))}
            </Grid>
          </Collapse>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
          <Button
            variant="contained"
            color="success"
            onClick={sensor_form_api.handleSubmit(
              async (data: ParsedSensorData) => {
                await onSubmit(data, true);

                if (
                  typeof data.dev_eui !== "string" ||
                  typeof data.family_id !== "number" ||
                  typeof data.product_id !== "number"
                ) {
                  console.error("Invalid data type while printing sticker");
                  console.error(data, typeof data.dev_eui, typeof data.family_id, typeof data.product_id);
                  return;
                }

                PrintSticker(
                  data.dev_eui,
                  data.family_id,
                  data.product_id,
                  selectedPrinter
                );
              }
            )}
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
            onClick={sensor_form_api.handleSubmit((data: ParsedSensorData) =>
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
  value,
}: {
  my_key: string;
  value: ParsedSensorValue;
}) {
  return (
    <Box sx={{ width: '100%' }}>
      {typeof value === 'boolean' ? (
        <FormControlLabel
          control={<Checkbox checked={value} />}
          label={my_key}
          labelPlacement="start"
          sx={{
            justifyContent: 'space-between',
            marginLeft: 0,
            '& .MuiFormControlLabel-label': { fontWeight: 500 }
          }}
        />
      ) : typeof value === 'number' ? (
        <TextField
          fullWidth
          label={my_key}
          type="number"
          value={value}
          variant="outlined"
          InputLabelProps={{ shrink: true }}
        />
      ) : typeof value === 'string' ? (
        <TextField
          fullWidth
          label={my_key}
          value={value}
          variant="outlined"
          InputLabelProps={{ shrink: true }}
        />
      ) : Array.isArray(value) ? (
        <Select
          fullWidth
          label={my_key}
          value={value[0]}
          variant="outlined"
        >
          {value.map((item, index) => (
            <MenuItem key={index} value={item}>
              {item}
            </MenuItem>
          ))}
        </Select>
      ) : (
        <Typography color="error">Invalid value type</Typography>
      )}
    </Box>
  );
}
function getStatusColor(
  status: ParsedSensorValue,
  current_sensor: ParsedSensorData
) {
  const target = useSensorStore.getState().target_sensor_data;
  if (typeof current_sensor === "undefined" || typeof target === "undefined")
    return "white"; /// hitor iskanje

  const is_equal = target === current_sensor?.data;

  if (is_equal) {
    // TODO: return {color:"green", message: "OK"};
    return "green";
  } else if (!is_equal && (status === 1 || status === 2)) {
    return "yellow";
  } else {
    return "red";
  }
}
