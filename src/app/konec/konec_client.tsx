"use client";

import { useRouter } from "next/navigation";
import { RatedSensorData, useSensorStore } from "../dev/components/SensorStore";
//import { useCallback } from "react";
//import { insert } from "~/server/GAPI_ACTION/create_folder";
import { useGoogleIDSstore } from "../parametrs/components/Credentisal";
import { Button, Card, CardContent, CardActions, Typography, Box, Paper, Divider } from "@mui/material"
import { useQuery } from "@tanstack/react-query";
import { GetSensors } from "../sensors/components/backend";
import { Senzor } from "@prisma/client";


type SensorDataforSpreadsheet = {
  Device_name: string;
  Device_Type: string;
  dev_eui: string;
  app_key: string;
  join_eui: string;
  family_id: number;
  lora: {
    freq_reg: string;
    Sub_band: string;
    send_period: number;
  };
  device: {
    hw_ver: string;
    fw_ver: string;
    custom_FW: string;
    adc_delay: number;
    mov_thr: number;
  };
};

export function Konec() {
  const { data: sensors } = useQuery({
    queryKey: ["sensors"],
    queryFn: () => GetSensors(),
  });
  const credentials = useGoogleIDSstore((state) => state.set_data);
  const sensor_data = useSensorStore((state) => state.sensors);
  const resetStore = useSensorStore((state) => state.reset);
  // const custom_FW = "N/A";
  // const lorawan_version = "RP001_V1_0_3_REV_A";
  const router = useRouter();

  // const posli = useCallback(async () => {

  //   console.log("Pošiljam");
  //   console.log(sensor_data);

  //   for (const element of sensor_data) {
  //     for (const key in element) {
  //       console.log("Key", key);
  //       console.log("Value", element[key] as unknown as string);
  //       console.log("Status", element.okay);
  //       console.log("Element", element.data);

  //       // if (element.okay) {
  //       //   let model_id = "";
  //       //   let device_name = "";
  //       //   let frequancy_plan_id = "";
  //       //   let band_id = "";

  //       //   switch (element?.data.family_id) {
  //       //     case 1:
  //       //       model_id = "SMC30";
  //       //       device_name = "Senstick Microclimate";
  //       //       break;
  //       //     case 2:
  //       //       model_id = "SSM40";
  //       //       break;
  //       //     case 3:
  //       //       model_id = "SXX3.6";
  //       //       break;
  //       //   }

  //       //   if (typeof element?.data.lora === 'object' && 'freq_reg' in element.data.lora) {
  //       //     switch (element?.data.lora.freq_reg) {
  //       //       case "AS923":
  //       //         frequancy_plan_id = "AS_920_923_TTN_AU";
  //       //         band_id = "AS_923";
  //       //         break;
  //       //       case "EU868":
  //       //         frequancy_plan_id = "EU_863_870_TTN";
  //       //         band_id = "EU_863_870";
  //       //         break;
  //       //       case "US915":
  //       //         frequancy_plan_id = "US_902_928_FSB_2";
  //       //         band_id = "US_902_928";
  //       //         break;
  //       //     }

  //       //     const newRowCSV = [
  //       //       `${model_id}-${element?.data.dev_eui}`,
  //       //       element?.data.dev_eui,
  //       //       element?.data.join_eui,
  //       //       device_name,
  //       //       frequancy_plan_id,
  //       //       lorawan_version,
  //       //       "unknown",
  //       //       element?.data.app_key,
  //       //       "Senzemo",
  //       //       model_id,
  //       //       typeof element?.data.device === 'object' && 'hw_ver' in element.data.device
  //       //         ? element.data.device.hw_ver
  //       //         : "Nisem našel podatka vnesi ročno",
  //       //       typeof element?.data.device === 'object' && 'fw_ver' in element.data.device
  //       //         ? element.data.device.fw_ver
  //       //         : "N/A",
  //       //       band_id,
  //       //     ];

  //       //     const newROWEXE = [
  //       //       model_id,
  //       //       element?.data.dev_eui,
  //       //       element?.data.app_key,
  //       //       element?.data.join_eui,
  //       //       element?.data.lora.freq_reg,
  //       //       "FSB2",
  //       //       typeof element?.data.device === 'object' && 'hw_ver' in element.data.device
  //       //         ? element.data.device.hw_ver
  //       //         : "N/A",
  //       //       typeof element?.data.device === 'object' && 'fw_ver' in element.data.device
  //       //         ? element.data.device.fw_ver
  //       //         : "N/A",
  //       //       custom_FW,
  //       //       typeof element?.data.lora === 'object' && 'send_period' in element.data.lora
  //       //         ? element.data.lora.send_period
  //       //         : "N/A",
  //       //       typeof element?.data.device === 'object' && 'adc_delay' in element.data.device
  //       //         ? element.data.device.adc_delay
  //       //         : "N/A",
  //       //       typeof element?.data.device === 'object' && 'mov_thr' in element.data.device
  //       //         ? element.data.device.mov_thr
  //       //         : "N/A",
  //       //     ];

  //       //     if (!credentials?.fileId) {
  //       //       throw new Error("No credentials");
  //       //     }

  //       //     console.log(newROWEXE);
  //       //     await insert(
  //       //       credentials.fileId,
  //       //       newRowCSV as string[],
  //       //       credentials.spreadsheetId,
  //       //       newROWEXE as string[]
  //       //     );
  //       // }
  //     }
  //   }
  // }
  // // }, [sensor_data, credentials?.fileId, credentials?.spreadsheetId]);
  return (
    <Card sx={{ maxWidth: 800, margin: "auto", mt: 4 }}>
      <CardContent>
        <Typography variant="h4" component="div" gutterBottom align="center">
          Konec
        </Typography>
        <Box sx={{ mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            Sensor Data
          </Typography>
          <Paper
            elevation={3}
            sx={{
              maxHeight: 200,
              overflow: "auto",
              p: 2,
              backgroundColor: "#f5f5f5",
            }}
          >
            <pre style={{ margin: 0 }}>{JSON.stringify(sensor_data, null, 2)}</pre>
          </Paper>
        </Box>
        <Divider sx={{ my: 2 }} />
        <Box sx={{ mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            Credentials
          </Typography>
          <Paper
            elevation={3}
            sx={{
              maxHeight: 200,
              overflow: "auto",
              p: 2,
              backgroundColor: "#f5f5f5",
            }}
          >
            <pre style={{ margin: 0 }}>{JSON.stringify(credentials, null, 2)}</pre>
          </Paper>
        </Box>
      </CardContent>
      <CardActions sx={{ justifyContent: "space-between", p: 2 }}>
        <Button variant="contained" color="primary" onClick={() => posli(sensor_data, sensors)}>
          Pošlji
        </Button>
        <Button
          variant="outlined"
          color="secondary"
          onClick={() => {
            resetStore();
            router.push("/parametrs");
          }}
        >
          Reset and Go Back
        </Button>
        <Button variant="outlined" onClick={() => posli(sensor_data, sensors)}>
          Test
        </Button>
      </CardActions>
    </Card>
  );
}





function posli(sensor_data: RatedSensorData[], sensors: Senzor[] | undefined): void {
  console.log("Pošiljam");
  console.log(sensor_data);


  // Create array of good sensors and map to required format
  const goodSensors: SensorDataforSpreadsheet[] = sensor_data
    .filter(element => element.okay)
    .map(element => {

      const sensorData = element.data;
      const custom_FW = "N/A";
      let freq_reg = "";
      let Sub_band = "";
      let Device_Type = "";
      let model_id = "";
      (sensors ?? []).forEach((sensor: Senzor) => {
        if (sensor.productId === sensorData.product_id && sensor.familyId === sensorData.family_id) {
          Device_Type = sensor.description ?? "We don?t know";
          model_id = sensor.sensorName ?? "We don?t know";
        }
      });

      switch (sensorData.lora_freq_reg) {
        case "AS923":
          freq_reg = "AS_920_923_TTN_AU";
          Sub_band = "AS_923";
          break;
        case "EU868":
          freq_reg = "EU_863_870_TTN";
          Sub_band = "EU_863_870";
          break;
        case "US915":
          freq_reg = "US_902_928_FSB_2";
          Sub_band = "US_902_928";
          break;
      }

      return {
        Device_name: `${model_id}-${element?.data.dev_eui}`,
        Device_Type: Device_Type,
        dev_eui: String(sensorData.dev_eui),
        app_key: String(sensorData.app_key),
        join_eui: String(sensorData.join_eui),
        family_id: Number(sensorData.family_id),
        lora: {
          freq_reg: freq_reg,
          Sub_band: Sub_band,
          send_period: Number(sensorData.lora_send_period),
        },
        device: {
          hw_ver: String(sensorData.device_device_hw_ver),
          fw_ver: String(sensorData.device_fw_ver),
          custom_FW: custom_FW, // Make sure this variable is defined
          adc_delay: Number(sensorData.device_adc_delay),
          mov_thr: Number(sensorData.device_mov_thr),
        },
      };
    });

  console.log("Processed good sensors:", goodSensors);

  await insert(
    credentials.fileId,
    newRowCSV as string[],
    credentials.spreadsheetId,
    newROWEXE as string[]

  );


}


