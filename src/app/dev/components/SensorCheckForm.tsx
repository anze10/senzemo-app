"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ParsedSensorData,
  ParsedSensorValue,
  SensorParserCombinator,
} from "./Reader/ParseSensorData";
import { useSensorStore } from "./SensorStore";
import { usePrinterStore } from "./printer/printer_settinsgs_store";
import { useForm } from "react-hook-form";
import { connectToPort, readDataFromPort } from "./Reader/HandleClick";
import { Box } from "@mui/system";
import { Button, Divider } from "@mui/material";
import { PrintSticker } from "./printer/printer_server_side";

export function SensorCheckForm({
  // parsed_sensor_data,
  sensor_parsers,
}: {
  // parsed_sensor_data: ParsedSensorData;
  sensor_parsers: SensorParserCombinator;
}) {
  const portRef = useRef<SerialPort | null>(null);
  const selectedPrinter = usePrinterStore((state) => state.selectedPrinter);

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

    if (!current_sensor) return [important, unimportant];
    Object.entries(current_sensor.data).forEach(([key, value]) => {
      const parser = sensor_parsers.find(
        (parser) => parser.output.name === key
      );

      if (!parser) {
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
    <>
      <form>
        <p>Important</p>
        {Object.entries(important_sensor_data).map(([key, value]) => (
          <DynamicFormComponent key={key} my_key={key} value={value} />
        ))}
        <Divider />
        <p>Unimportant</p>
        {Object.entries(unimportant_sensor_data).map(([key, value]) => (
          <DynamicFormComponent key={key} my_key={key} value={value} />
        ))}
        <Box className="mt-4 flex justify-between">
          <Button
            onClick={sensor_form_api.handleSubmit(
              async (data: ParsedSensorData) => {
                await onSubmit(data, true);

                if (
                  typeof data.dev_eui !== "string" ||
                  typeof data.family_id !== "number" ||
                  typeof data.product_id !== "number"
                ) {
                  console.error("Invalid data type while printing sticker");
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
            style={{
              backgroundColor: "#4CAF50",
              color: "white",
              padding: "10px 20px",
            }}
          >
            Accept
          </Button>
          <Button
            href="/konec"
            onClick={async () => {
              // await createFolderAndSpreadsheet();
              set_current_sensor_index(0);
            }}
            style={{
              backgroundColor: "#f44336",
              color: "white",
              padding: "10px 20px",
            }}
          >
            Finish
          </Button>
          <Button
            onClick={sensor_form_api.handleSubmit((data: ParsedSensorData) =>
              onSubmit(data, false)
            )}
            style={{
              backgroundColor: "#4CAF50",
              color: "white",
              padding: "10px 20px",
            }}
          >
            not Accept
          </Button>
        </Box>
      </form>
    </>
  );
}

export function DynamicFormComponent({
  my_key,
  value,
}: {
  my_key: string;
  value: ParsedSensorValue;
}) {
  if (typeof value === "boolean") {
    return (
      <div key={my_key}>
        <label>{my_key}</label>
        <input type="checkbox" checked={value} />
      </div>
    );
  } else if (typeof value === "number") {
    return (
      <div key={my_key}>
        <label>{my_key}</label>
        <input type="number" value={value} />
      </div>
    );
  } else if (typeof value === "string") {
    return (
      <div key={my_key}>
        <label>{my_key}</label>
        <input type="text" value={value} />
      </div>
    );
  } else if (Array.isArray(value)) {
    return (
      <div key={my_key}>
        <label>{my_key}</label>
        <select>
          {value.map((item, index) => (
            <option key={index} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>
    );
  } else {
    throw new Error("Invalid value type");
  }
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
