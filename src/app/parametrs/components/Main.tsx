"use client";

import {
  Button,
  InputLabel,
  Input,
  MenuItem,
  Select,
  Box,
  Typography,
  TextField,
  FormControlLabel,
  Checkbox
} from "@mui/material";

import { createFolderAndSpreadsheet } from "~/server/GAPI_ACTION/create_folder";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import type { SensorFormSchemaType } from "src/app/dev/components/Reader";
import { useSensorStore } from "~/app/dev/components/SensorStore";
import { useGoogleIDSstore } from "./Credentisal";
import { GetArrayofDevices } from "./functions";
import { useQuery } from "@tanstack/react-query";
import { Sensor } from "./functions";
import { ParsedSensorValue } from "~/app/dev/components/Reader/ParseSensorData";

export default function Parameters() {
  const sensor_form_api = useForm<SensorFormSchemaType>();
  const [order_number, set_order_number] = useState<string>("");

  // const devices = useQuery({ queryKey: ['device'], queryFn: GetArrayofDevices });

  const devices = useQuery<Sensor[]>({
    queryKey: ["device"],
    queryFn: GetArrayofDevices,
  });
  if (devices.data) {
    for (const device of devices.data) {
      console.log(device);
    }
  } else {
    console.log("No data");
  }

  const router = useRouter();
  const set_default_sensor_data = useSensorStore(
    (state) => state.set_target_sensor_data
  );






  const set_credentials = useGoogleIDSstore((state) => state.set_credentials);
  return (
    <form>
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
              <InputLabel htmlFor="frequency-region">Izberi senzor</InputLabel>
              <Controller
                name="family_id"
                control={sensor_form_api.control}
                defaultValue={1}
                render={({ field }) => (
                  <Select id="family_id" {...field} fullWidth>

                    {devices.data?.map((device) => (
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
        <Box className="mt-8 flex justify-center">
          <Button
            variant="contained"
            color="primary"
            onClick={async () => {
              const formData = sensor_form_api.getValues(); // Get the current form values
              set_default_sensor_data(formData); // Update the store with form data

              // Log the data that was just stored in the store
              console.log("Data stored in default_sensor_data:", formData);
              const custome_name = formData.company_name;
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

    </form >
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