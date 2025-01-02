"use client";

import {
  Button,
  InputLabel,
  Input,
  MenuItem,
  Select,
  Box,
  Typography,
} from "@mui/material";
import { createFolderAndSpreadsheet } from "src/server/create_foldet";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import type { SensorFormSchemaType } from "src/app/dev/components/Reader";
import { useSensorStore } from "~/app/dev/components/SensorStore";
import { useGoogleIDSstore } from "./Credentisal";

export default function Parameters() {
  return (

    <Component />
  );
}

function Component() {







  const sensor_form_api = useForm<SensorFormSchemaType>();
  const [order_number, set_order_number] = useState<string>("");

  const router = useRouter();
  const set_default_sensor_data = useSensorStore(
    (state) => state.set_default_sensor_data,
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
                    <MenuItem value={1}>SMC30</MenuItem>
                    <MenuItem value={2}>SSM40</MenuItem>
                    <MenuItem value={3}>SXX3.6</MenuItem>
                  </Select>
                )}
              />
            </Box>
            <Box className="min-w-[200px] flex-1">
              <Controller
                control={sensor_form_api.control}
                name="join_eui"
                render={({ field }) => (
                  <>
                    <InputLabel htmlFor="join_eui">Join EUI</InputLabel>
                    <Input {...field} fullWidth placeholder="Enter Join EUI" />
                  </>
                )}
              />
            </Box>
            <Box className="min-w-[200px] flex-1">
              <Controller
                control={sensor_form_api.control}
                name="app_key"
                render={({ field }) => (
                  <>
                    <InputLabel htmlFor="app-key">App Key</InputLabel>
                    <Input {...field} fullWidth placeholder="Enter App Key" />
                  </>
                )}
              />
            </Box>
            <Box className="min-w-[200px] flex-1">
              <Controller
                control={sensor_form_api.control}
                name="device.status"
                defaultValue={0}
                render={({ field }) => (
                  <>
                    <InputLabel htmlFor="device.status">Status</InputLabel>
                    <Input
                      disabled
                      {...field}
                      fullWidth
                      placeholder="Status"
                      style={{
                        fontSize: "1.25rem",
                        padding: "0.75rem",
                      }}
                    />
                  </>
                )}
              />
            </Box>
            <Box className="min-w-[200px] flex-1">
              <Controller
                control={sensor_form_api.control}
                name="lora.dr_adr_en"
                render={({ field }) => (
                  <>
                    <InputLabel htmlFor="lora.dr_adr_en">Data Rate</InputLabel>
                    <Input
                      {...field}
                      fullWidth
                      placeholder="Data Rate"
                      style={{
                        fontSize: "1.25rem",
                        padding: "0.75rem",
                      }}
                    />
                  </>
                )}
              />
            </Box>
            <Box className="min-w-[200px] flex-1">
              <InputLabel htmlFor="frequency-region">
                Frequency Region
              </InputLabel>
              <Controller
                name="lora.freq_reg"
                control={sensor_form_api.control}
                defaultValue=""
                render={({ field }) => (
                  <Select id="lora.freq_reg" {...field} fullWidth>
                    <MenuItem value="AS923">AS923</MenuItem>
                    <MenuItem value="EU868">EU868</MenuItem>
                    <MenuItem value="US915">US915</MenuItem>
                  </Select>
                )}
              />
            </Box>
            <Box className="min-w-[200px] flex-1">
              <Controller
                control={sensor_form_api.control}
                name="lora.hyb_asoff_mask0_1"
                render={({ field }) => (
                  <>
                    <InputLabel htmlFor="lora.hyb_asoff_mask0_1">
                      Hybrid Enable + AS923 Offset + Mask0-1
                    </InputLabel>
                    <Input
                      {...field}
                      fullWidth
                      placeholder="Hybrid Enable + AS923 Offset + Mask0-1"
                      style={{
                        fontSize: "1.25rem",
                        padding: "0.75rem",
                      }}
                    />
                  </>
                )}
              />
            </Box>
            <Box className="min-w-[200px] flex-1">
              <Controller
                control={sensor_form_api.control}
                name="lora.mask2_5"
                render={({ field }) => (
                  <>
                    <InputLabel htmlFor="lora.mask2_5">
                      Hybrid Mask 2-5
                    </InputLabel>
                    <Input
                      {...field}
                      fullWidth
                      placeholder="Hybrid Mask 2-5"
                      style={{
                        fontSize: "1.25rem",
                        padding: "0.75rem",
                      }}
                    />
                  </>
                )}
              />
            </Box>
            <Box className="min-w-[200px] flex-1">
              <Controller
                control={sensor_form_api.control}
                name="lora.send_period"
                render={({ field }) => (
                  <>
                    <InputLabel htmlFor="lora.send_period">
                      Send Period
                    </InputLabel>
                    <Input
                      {...field}
                      fullWidth
                      placeholder=""
                      style={{
                        fontSize: "1.25rem",
                        padding: "0.75rem",
                      }}
                    />
                  </>
                )}
              />
            </Box>
            <Box className="min-w-[200px] flex-1">
              <Controller
                control={sensor_form_api.control}
                name="lora.ack"
                render={({ field }) => (
                  <>
                    <InputLabel htmlFor="lora.ack">ACK</InputLabel>
                    <Input
                      {...field}
                      fullWidth
                      placeholder=""
                      style={{
                        fontSize: "1.25rem",
                        padding: "0.75rem",
                      }}
                    />
                  </>
                )}
              />
            </Box>
            <Box className="min-w-[200px] flex-1">
              <Controller
                control={sensor_form_api.control}
                name="device.mov_thr"
                render={({ field }) => (
                  <>
                    <InputLabel htmlFor="device.mov_thr">MOV THR</InputLabel>
                    <Input
                      {...field}
                      fullWidth
                      placeholder=""
                      style={{
                        fontSize: "1.25rem",
                        padding: "0.75rem",
                      }}
                    />
                  </>
                )}
              />
            </Box>
            <Box className="min-w-[200px] flex-1">
              <Controller
                control={sensor_form_api.control}
                name="company_name"
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
                  order_number,
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
      </Box>
    </form>
  );
}
