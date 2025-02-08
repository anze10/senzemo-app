"use client";
import React, { useState, useEffect, useRef } from "react";
import { useForm, Controller } from "react-hook-form";
import {
  Button,
  InputLabel,
  Input,
  Box,
  Select,
  MenuItem,
} from "@mui/material";
import { connectToPort, readDataFromPort } from "./Reader/HandleClick";
import { logOut as signOut } from "~/server/LOGIN_LUCIA_ACTION/auth.action";
import { useSensorStore } from "./SensorStore";
import { z } from "zod";
// import type { Session } from "next-auth";
import { parseZodSchema } from "zod-key-parser";
import SMC30_parser from "./Reader/ConvertToJason";

export const sensor_form_schema = z.object({
  dev_eui: z.string(),
  family_id: z.number(),
  product_id: z.number(),
  temperature: z.number(),
  humidity: z.number(),
  join_eui: z.string(),
  app_key: z.string(),
  lora: z.object({
    ack: z.number(),
    send_period: z.number(),
    dr_adr_en: z.number(),
    freq_reg: z.enum(["AS923", "EU868", "US915", ""]),
    hyb_asoff_mask0_1: z.number(),
    mask2_5: z.number(),
  }),
  device: z.object({
    adc_delay: z.number(),
    adc_en: z.number(),
    fw_ver: z.number(),
    hw_ver: z.number(),
    mov_thr: z.number(),
    status: z.number(),
  }),

  company_name: z.string(),
});

export const parsed_sensor_schema = parseZodSchema(sensor_form_schema);
export type SensorFormSchemaType = z.infer<typeof sensor_form_schema>;

const SerialPortComponent = () => {
  const portRef = useRef<SerialPort | null>(null);

  const GetDataFromSensor = async (onDataReceived: (data: string) => void) => {
    try {
      if (!portRef.current) {
        portRef.current = await connectToPort();
      } else {
        console.log("Port is already connected.");
      }

      console.log("Port:", portRef.current);
      const data = await readDataFromPort(portRef.current, onDataReceived);
      if (!data) {
        console.error("No data received.");
        return;
      }

      return SMC30_parser(data);
    } catch (error) {
      console.error("Failed to handle click:", error);
    }
  };

  const [showAdditionalDetails, setShowAdditionalDetails] =
    useState<boolean>(false);

  const current_sensor_index = useSensorStore(
    (state) => state.current_sensor_index
  );

  const default_sensor_data = useSensorStore(
    (state) => state.default_sensor_data
  );
  console.log("default_sensor_data", default_sensor_data);

  const current_sensor = useSensorStore(
    (state) => state.sensors[state.current_sensor_index]
  );

  const all_sensors = useSensorStore((state) => state.sensors);

  const add_new_sensor = useSensorStore((state) => state.add_new_sensor);

  const set_sensor_status = useSensorStore((state) => state.set_sensor_status);

  const set_common_sensor_data = useSensorStore(
    (state) => state.set_common_sensor_data
  );

  const set_current_sensor_index = useSensorStore(
    (state) => state.set_current_sensor_index
  );

  /* useEffect(() => {
    // zamenjaj z funkcijo ki uporabi prejšn socket
    void handleClick((data) => initialize_sensor_data(data));
  }, [initialize_sensor_data, sensorNumber]); */

  /* useEffect(() => {
    console.log(all_sensors);
  }, [all_sensors]); */

  // if values of a are undefined, don't compare them
  const recursive_compare = (
    a: Record<string, unknown>,
    b: Record<string, unknown>
  ): boolean => {
    for (const key in a) {
      if (!Object.keys(a).includes(key)) continue;

      const a_value = a[key];
      const b_value = b[key];
      if (typeof a_value === "undefined") continue;

      if (typeof a_value === "object") {
        if (typeof b_value !== "object") {
          return false;
        }

        return recursive_compare(
          a_value as Record<string, unknown>,
          b_value as Record<string, unknown>
        );
      } else {
        if (a_value !== b_value) return false;
      }
    }

    return true;
  };

  const getStatusColor = (status: number | undefined) => {
    // const isEqual = is_equal(current_sensor?.data.common_data as SensorFormSchemaType, default_sensor_data);
    if (
      typeof current_sensor === "undefined" ||
      typeof default_sensor_data === "undefined"
    )
      return "orange";

    const is_equal = recursive_compare(
      default_sensor_data,
      current_sensor?.data.common_data
    );

    if (is_equal) {
      // TODO: return {color:"green", message: "OK"};
      return "green";
    } else if (!is_equal && (status === 1 || status === 2)) {
      return "yellow";
    } else if (!is_equal) {
      return "red";
    } else {
      return "white";
    }
  };

  const sensor_form_api = useForm<SensorFormSchemaType>();
  useEffect(() => {
    console.log("current_sensor", current_sensor);
  }, [current_sensor]);

  const onSubmit = async (data: SensorFormSchemaType, okay: boolean) => {
    console.log("onSubmit before", {
      all_sensors,
      current_sensor_index,
      current_sensor,
    });

    set_sensor_status(current_sensor_index, okay);

    set_common_sensor_data(current_sensor_index, data);

    console.log("onSubmit after", {
      all_sensors,
      current_sensor_index,
      current_sensor,
    });

    sensor_form_api.reset();

    // set_current_sensor_index(current_sensor_index + 1);
    await GetDataFromSensor((data) => add_new_sensor(data));
  };

  /* const updateForm = (data: string) => {
    add_new_sensor(data);
 
    for (const key of data.)
      sensor_form_api.setValue()
  }; */

  useEffect(() => {
    if (!current_sensor?.data?.common_data) return;

    for (const key in parsed_sensor_schema.keys) {
      const safe_key = key as keyof SensorFormSchemaType;
      sensor_form_api.setValue(
        safe_key,
        current_sensor.data.common_data[safe_key]
      );
    }
  }, [current_sensor?.data?.common_data, sensor_form_api]);

  return (
    <form>
      <Box style={{ fontFamily: "Montserrat, sans-serif", width: "100%" }}>
        {/* <Box
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "10px 20px",
            backgroundColor: "#f5f5f5",
          }}
        >
          <Button
            onClick={async () =>
              await GetDataFromSensor((data) => add_new_sensor(data))
            }
            style={{
              backgroundColor: "#4CAF50",
              color: "white",
              padding: "10px 20px",
              border: "none",
              cursor: "pointer",
            }}
          >
            Open Serial Port
          </Button>
          <Box style={{ display: "flex", alignItems: "center" }}>

          </Box>
        </Box> */}
        <Box className="px-6 py-8 md:px-8 md:py-12">
          <h1 className="mb-8 text-center text-3xl font-bold">SENZEMO</h1>
          <h2 className="py-4">Senzor št: {current_sensor_index}</h2>
          <Box
            style={{
              display: "flex",
              flexDirection: "row",
              gap: "0.5rem",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: getStatusColor(
                current_sensor?.data.common_data.device.status
              ),
              padding: "10px",
              borderRadius: "8px",
              marginBottom: "20px",
              width: "100%",
            }}
          >
            <Box
              style={{
                border: "1px solid black",
                padding: "0.5rem",
                borderRadius: "8px",
              }}
            >
              <Controller
                control={sensor_form_api.control}
                name="dev_eui"
                render={({ field }) => (
                  <>
                    <InputLabel htmlFor="dev_eui">Device EUI</InputLabel>
                    <Input {...field} />
                  </>
                )}
              />
            </Box>
            <Box
              style={{
                border: "1px solid black",
                padding: "0.5rem",
                borderRadius: "8px",
              }}
            >
              {/* preveri črkovanje */}
              <Controller
                control={sensor_form_api.control}
                name="device.status"
                render={({ field }) => (
                  <>
                    <InputLabel htmlFor="device.status">Status</InputLabel>
                    <Input
                      disabled
                      style={{
                        fontSize: "1.5rem",
                        width: "100%",
                        padding: "0.5rem",
                      }}
                      {...field}
                    />
                  </>
                )}
              />
            </Box>
            <Box
              style={{
                border: "1px solid black",
                padding: "0.5rem",
                borderRadius: "8px",
              }}
            >
              <InputLabel htmlFor="frequency-region">
                Frequency Region
              </InputLabel>
              <Controller
                name="lora.freq_reg"
                control={sensor_form_api.control}
                defaultValue=""
                render={({ field }) => (
                  <Select id="lora.freq_reg" {...field}>
                    <MenuItem value="AS923">AS923</MenuItem>
                    <MenuItem value="EU868">EU868</MenuItem>
                    <MenuItem value="US915">US915</MenuItem>
                  </Select>
                )}
              />
            </Box>
            <Box
              style={{
                border: "1px solid black",
                padding: "0.5rem",
                borderRadius: "8px",
              }}
            >
              <Controller
                control={sensor_form_api.control}
                name="temperature"
                render={({ field }) => (
                  <>
                    <InputLabel htmlFor="temperature">Temperature</InputLabel>
                    <Input {...field} />
                  </>
                )}
              />
            </Box>
            <Box
              style={{
                border: "1px solid black",
                padding: "0.5rem",
                borderRadius: "8px",
              }}
            >
              <Controller
                control={sensor_form_api.control}
                name="humidity"
                render={({ field }) => (
                  <>
                    <InputLabel htmlFor="humidity">Humidity</InputLabel>
                    <Input {...field} />
                  </>
                )}
              />
            </Box>
          </Box>
          <Button
            onClick={() => setShowAdditionalDetails(!showAdditionalDetails)}
            style={{
              backgroundColor: "#008CBA",
              color: "white",
              padding: "10px 20px",
              border: "none",
              cursor: "pointer",
              marginTop: "20px",
            }}
          >
            {showAdditionalDetails ? "Show Less" : "Show More"}
          </Button>
          {showAdditionalDetails && (
            <Box className="mt-4">
              <Box className="grid grid-cols-1 gap-6 md:grid-cols-4">
                <Box>
                  <Controller
                    control={sensor_form_api.control}
                    name="join_eui"
                    render={({ field }) => (
                      <>
                        <InputLabel htmlFor="join-eui">Join EUI</InputLabel>
                        <Input {...field} />
                      </>
                    )}
                  />
                </Box>
                <Box>
                  <Controller
                    control={sensor_form_api.control}
                    name="app_key"
                    render={({ field }) => (
                      <>
                        <InputLabel htmlFor="app-key">App Key</InputLabel>
                        <Input {...field} />
                      </>
                    )}
                  />
                </Box>
                <Box>
                  <Controller
                    control={sensor_form_api.control}
                    name="lora.send_period"
                    render={({ field }) => (
                      <>
                        <InputLabel htmlFor="lora.send_period">
                          Send Period
                        </InputLabel>
                        <Input {...field} />
                      </>
                    )}
                  />
                </Box>
                <Box>
                  <Controller
                    control={sensor_form_api.control}
                    name="lora.ack"
                    render={({ field }) => (
                      <>
                        <InputLabel htmlFor="ack">ACK</InputLabel>
                        <Input {...field} />
                      </>
                    )}
                  />
                </Box>
              </Box>
              <Box className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2">
                <Box>
                  <Controller
                    control={sensor_form_api.control}
                    name="device.mov_thr"
                    render={({ field }) => (
                      <>
                        <InputLabel htmlFor="device.mov_thr">
                          MOV THR
                        </InputLabel>
                        <Input {...field} />
                      </>
                    )}
                  />
                </Box>
                {/* <Box>
                  <Controller
                    control={sensor_form_api.control}
                    name="device.adc_delay"
                    defaultValue={
                      get_current_sensor_data("device.adc_delay") as number
                    }
                    render={({ field }) => (
                      <>
                        <InputLabel htmlFor="device.adc_delay">ADC Delay</InputLabel>
                        <Input {...field} />
                      </>
                    )}
                  />
                </Box> */}
              </Box>
              <Box className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2">
                {/*To dobimo iz  parameters strani sm je treba povezavo med strannema nardit */}
                <Controller
                  control={sensor_form_api.control}
                  name="device.mov_thr"
                  render={({ field }) => (
                    <Box>
                      <InputLabel htmlFor="company-name">
                        Company Name
                      </InputLabel>
                      <Input {...field} />
                    </Box>
                  )}
                />

                {/* <Box style={{ display: "flex", alignItems: "center" }}>
                  <Controller
                    name="device.adc_en"
                    control={sensor_form_api.control}
                    rules={{ required: true }}
                    render={({ field }) => <Checkbox {...field} />}
                  />
                  <span>ADC Enable</span>
                </Box> */}
              </Box>
            </Box>
          )}
          <Box className="mt-4 flex justify-between">
            <Button
              onClick={sensor_form_api.handleSubmit(
                (data: SensorFormSchemaType) => onSubmit(data, true)
              )}
              style={{
                backgroundColor: "#4CAF50",
                color: "white",
                padding: "10px 20px",
              }}
            >
              Accept
            </Button>
            <Button onClick={async () => await signOut()}>Odjavi se</Button>
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
              onClick={sensor_form_api.handleSubmit(
                (data: SensorFormSchemaType) => onSubmit(data, false)
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
        </Box>
      </Box>
    </form>
  );
};

export default SerialPortComponent;
