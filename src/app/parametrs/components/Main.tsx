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
  FormControl,
  SelectChangeEvent,
} from "@mui/material";
import { createFolderAndSpreadsheet } from "~/server/GAPI_ACTION/create_folder";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSensorStore } from "~/app/dev/components/SensorStore";
import { useGoogleIDSstore } from "./Credentisal";
import {
  ParsedSensorData,
  ParsedSensorValue,
  SensorParserCombinator,
} from "~/app/dev/components/Reader/ParseSensorData";
import { useQuery } from "@tanstack/react-query";
import { GetSensors } from "./db";
import { DynamicFormComponent } from "~/app/dev/components/SensorCheckForm";

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
        device => device.product === value
      );
      setDecoder(selectedDevice?.decoder);


      const newValues: ParsedSensorData = {};
      selectedDevice?.decoder?.forEach((parser) => {
        newValues[parser.output.name] = parser.output.default;
      });
      setFormValues(newValues);
    },
    [devices]
  );
  const handleFamilyIdChange = (value: number) => {
    set_family_id(value);
    handleSelectChange(value);
  };

  useEffect(() => {
    handleSelectChange(family_id);
  }, [family_id, handleSelectChange]);

  const handleValueChange = (name: string, value: ParsedSensorValue) => {
    setFormValues(prev => ({ ...prev, [name]: value }));
  };

  return (
    <Box component="form">
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
              <InputLabel htmlFor="Company_name">Company Name</InputLabel>
              <Input
                id="Company_name"
                value={company_name}
                onChange={(e) => set_company_name(e.target.value)}

                required
              />
            </FormControl>

            <FormControl fullWidth>
              <InputLabel htmlFor="serial-number">Order Number</InputLabel>
              <Input
                id="serial-number"
                value={order_number}
                onChange={(e) => set_order_number(e.target.value)}
                required
              />
            </FormControl>
            <Grid2 container spacing={2} sx={{ mt: 1 }}>
              {decoder?.map((parser) => (
                <Grid2 size={{ xs: 12, sm: 6, md: 4 }} key={parser.output.name}>
                  <DynamicFormComponent
                    my_key={parser.output.name}
                    my_type={parser.output.type}
                    value={formValues[parser.output.name] ?? parser.output.default}
                    enum_values={parser.output.enum_values}
                    onValueChange={handleValueChange}
                  />
                </Grid2>
              ))}
            </Grid2>
          </Box>
        </Box>



        <Box className="mt-8 flex justify-center">
          <Button
            variant="contained"
            color="primary"
            onClick={async () => {
              if (company_name.trim() === "") {
                alert("Company name must not be empty.");
                return;
              }
              const formData = {
                family_id,
                company_name,
                order_number,
                ...formValues
              };

              set_target_sensor_data(formData);
              console.log("Data stored:", formData);

              const result = await createFolderAndSpreadsheet(
                company_name,
                order_number
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
  );
}
