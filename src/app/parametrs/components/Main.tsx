"use client";

import {
  Button,
  InputLabel,
  Input,
  MenuItem,
  Select,
  Box,
  Typography,
  Grid2,
} from "@mui/material";

import { createFolderAndSpreadsheet } from "~/server/GAPI_ACTION/create_folder";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm, FormProvider } from "react-hook-form";
import { useSensorStore } from "~/app/dev/components/SensorStore";
import { useGoogleIDSstore } from "./Credentisal";
import {
  ParsedSensorData,
  ParsedSensorValue,
  SensorParserCombinator,
} from "~/app/dev/components/Reader/ParseSensorData";
import { DynamicFormComponent } from "~/app/dev/components/SensorCheckForm";
import { useQuery } from "@tanstack/react-query"; // Added tanstack query import
import { GetSensors } from "~/app/sensors/components/backend";

type DeviceType = {
  name: string;
  product: number;
  familyId: number;
  decoder: SensorParserCombinator;
};

export default function Parameters() {
  const [order_number, set_order_number] = useState<string>("");
  const [decoder, setDecoder] = useState<SensorParserCombinator | undefined>();

  const router = useRouter();
  const set_target_sensor_data = useSensorStore(
    (state) => state.set_target_sensor_data
  );

  const set_credentials = useGoogleIDSstore((state) => state.set_credentials);

  const { data: sensors, isLoading } = useQuery({
    queryKey: ["sensors"],
    queryFn: async () => await GetSensors(),
  });

  const devices: DeviceType[] | undefined = useMemo(() => {
    console.log(sensors);
    return sensors?.map((device) => ({
      name: device.sensorName,
      product: device.productId,
      familyId: device.familyId,
      decoder: device.decoder as SensorParserCombinator,
    }));
  }, [sensors]);

  const defaultValues = useMemo(() => {
    const result: ParsedSensorData = {};

    if (!decoder) return result;

    for (const parser of decoder) {
      result[parser.output.name] = parser.output.default;
    }

    console.warn("Default values:", result);
    return result;
  }, [decoder]);

  const sensor_form_api = useForm<ParsedSensorData>({
    defaultValues,
  });

  const watchedFamilyId = sensor_form_api.watch("family_id");

  const handleSelectChange = useCallback(
    (value?: ParsedSensorValue) => {
      console.log("Select changed or mounted:", value);

      const currently_selected_device = devices?.find(
        (device) => device.product === value
      );

      setDecoder(currently_selected_device?.decoder);

      for (const key in currently_selected_device?.decoder) {
        const sensor_parser = currently_selected_device.decoder.find(
          (e) => e.output.name === key
        );

        if (!sensor_parser) continue;

        sensor_form_api.setValue(key, sensor_parser.output.default);
      }
    },
    [devices, sensor_form_api]
  );

  useEffect(() => {
    handleSelectChange(watchedFamilyId);
  }, [watchedFamilyId, handleSelectChange]);

  return (
    <FormProvider {...sensor_form_api}>
      <form>
        {/* Optional: Display a loading state */}
        {isLoading && <p>Loading...</p>}
        <Box className="flex min-h-screen flex-col items-center justify-center bg-gray-100 p-6">
          <Typography variant="h3" className="mb-8 font-bold">
            SENZEMO
          </Typography>
          <Box className="w-full rounded-lg bg-white p-6 shadow-md">
            <Typography variant="h5" className="mb-6 text-center font-semibold">
              Configuration
            </Typography>
            <Box className="flex flex-wrap gap-6">
              <Box className="min-w-[200px] flex-1">
                <InputLabel htmlFor="frequency-region">
                  Izberi senzor
                </InputLabel>
                <Controller
                  name="family_id"
                  control={sensor_form_api.control}
                  defaultValue={1}
                  render={({ field }) => (
                    <Select
                      id="family_id"
                      {...field}
                      fullWidth
                      onChange={(e) => {
                        field.onChange(e);
                        handleSelectChange(e.target.value);
                      }}
                    >
                      {devices?.map((device) => (
                        <MenuItem key={device.familyId} value={device.product}>
                          {device.name}
                        </MenuItem>
                      ))}
                    </Select>
                  )}
                />
              </Box>
              {/* tuki koda za prikazovanje deafult data */}
            </Box>
            <Box className="min-w-[200px] flex-1">
              <Controller
                control={sensor_form_api.control}
                name="company_name"
                defaultValue="Ni definirano"
                render={({ field }) => (
                  <>
                    <InputLabel htmlFor="Company_name">Company Name</InputLabel>
                    <Input
                      {...field}
                      fullWidth
                      placeholder=""
                      style={{
                        fontSize: "1.25rem",
                        padding: "0.75rem",
                      }}
                      required
                    />
                  </>
                )}
              />
            </Box>
            <Box className="min-w-[200px] flex-1">
              <InputLabel htmlFor="serial-number">Order Number</InputLabel>
              <Input
                id="serial-number"
                placeholder="Enter Serial Number"
                fullWidth
                value={order_number}
                onChange={(e) => set_order_number(e.target.value)}
                required
              />
            </Box>
          </Box>
          <Grid2 container spacing={2} sx={{ mt: 1 }}>
            {decoder?.map((parser) => (
              <Grid2 size={{ xs: 12, sm: 6, md: 4 }} key={parser.output.name}>
                <DynamicFormComponent
                  my_key={parser.output.name}
                  my_type={parser.output.type}
                  value={parser.output.default}
                  sensor_form_api_control={sensor_form_api.control}
                  enum_values={parser.output.enum_values}
                />
              </Grid2>
            ))}
          </Grid2>
          <Box className="mt-8 flex justify-center">
            <Button
              variant="contained"
              color="primary"
              onClick={async () => {
                const formData = sensor_form_api.getValues(); // Get the current form values
                set_target_sensor_data(formData); // Update the store with form data

                // Log the data that was just stored in the store
                console.log("Data stored in default_sensor_data:", formData);
                const custome_name = formData.company_name;
                if (typeof custome_name !== "string") {
                  console.error("Invalid company name");
                  return;
                }

                const result = await createFolderAndSpreadsheet(
                  custome_name,
                  order_number
                );
                console.log(result);
                set_credentials(result);
                router.push("/dev");
              }}
            >
              Start Scan
            </Button>
          </Box>
        </Box>
      </form>
    </FormProvider>
  );
}
