"use client";

import { useRouter } from "next/navigation";
import { useSensorStore } from "../dev/components/SensorStore";
import { useCallback } from "react";
import { insert } from "~/server/GAPI_ACTION/create_folder";
import { useGoogleIDSstore } from "../parametrs/components/Credentisal";
import { Button, Card, CardContent, CardActions, Typography, Box, Paper, Divider } from "@mui/material"

//import { string } from "zod";

export function Konec() {
  const credentials = useGoogleIDSstore((state) => state.set_data);
  const sensor_data = useSensorStore((state) => state.sensors);
  const resetStore = useSensorStore((state) => state.reset);
  const custom_FW = "N/A";

  const lorawan_version = "RP001_V1_0_3_REV_A";

  const router = useRouter();

  const posli = useCallback(async () => {
    console.log("Pošiljam");
    console.log(sensor_data);
    let newRowCSV = [];
    let newROWEXE = [];
    for (const element of sensor_data) {
      for (const key in element) {
        console.log("Key", key);
        console.log("Value", element[key] as unknown as string);
        console.log("Status", element.okay);
        console.log("Element", element.data);
        if (element.okay) {
          let model_id = "";
          let device_name = "";
          let frequancy_plan_id = "";
          let band_id = "";
          switch (element?.data.family_id) {
            case 1:
              model_id = "SMC30";
              device_name = "Senstick Microclimate";

              break;
            case 2:
              model_id = "SSM40";
              break;
            case 3:
              model_id = "SXX3.6";

              break;
          }
          if (typeof element?.data.lora === 'object' && 'freq_reg' in element.data.lora) {
            switch (element?.data.lora.freq_reg) {
              case "AS923":
                frequancy_plan_id = "AS_920_923_TTN_AU";
                band_id = "AS_923";
                break;
              case "EU868":
                frequancy_plan_id = "EU_863_870_TTN";
                band_id = "EU_863_870";
                break;
              case "US915":
                frequancy_plan_id = "US_902_928_FSB_2";
                band_id = "US_902_928";
                break;
            }

            newRowCSV = [
              model_id + "-" + element?.data.dev_eui,
              element?.data.dev_eui,
              element?.data.join_eui,
              device_name,
              frequancy_plan_id,
              lorawan_version,
              "unknown",
              element?.data.app_key,
              "Senzemo",
              model_id,
              typeof element?.data.device === 'object' && 'hw_ver' in element.data.device ? element.data.device.hw_ver : "Nisem našel podatka vnesi ročno",
              typeof element?.data.device === 'object' && 'fw_ver' in element.data.device ? element.data.device.fw_ver : "N/A",
              band_id,
            ];

            newROWEXE = [
              model_id,
              element?.data.dev_eui,
              element?.data.app_key,
              element?.data.join_eui,
              element?.data.lora.freq_reg,
              "FSB2",
              typeof element?.data.device === 'object' && 'hw_ver' in element.data.device ? element.data.device.hw_ver : "N/A",
              typeof element?.data.device === 'object' && 'fw_ver' in element.data.device ? element.data.device.fw_ver : "N/A",
              custom_FW,
              typeof element?.data.lora === 'object' && 'send_period' in element.data.lora ? element.data.lora.send_period : "N/A",
              typeof element?.data.device === 'object' && 'adc_delay' in element.data.device ? element.data.device.adc_delay : "N/A",
              typeof element?.data.device === 'object' && 'mov_thr' in element.data.device ? element.data.device.mov_thr : "N/A",
            ];
            if (!credentials?.fileId) {
              throw new Error("No credentials");
            }

            console.log(newROWEXE);
            void insert(
              credentials?.fileId,
              newRowCSV as string[],
              credentials?.spreadsheetId,
              newROWEXE as string[]
            );
            console.log("Pošiljam");
          }
        }
      }
    }, [sensor_data, credentials?.fileId, credentials?.spreadsheetId]);

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
        <Button variant="contained" color="primary" onClick={() => posli()}>
          Pošlji
        </Button>
        <Button
          variant="outlined"
          color="secondary"
          onClick={() => {
            resetStore()
            router.push("/parametrs")
          }}
        >
          Reset and Go Back
        </Button>
        <Button variant="outlined" onClick={async () => {
          console.log("Test");
          posli();
        }}>
          Test
        </Button>
      </CardActions>
    </Card>
  )
}
// <div>
//   <h1>Konec</h1>
//   <pre>{JSON.stringify(sensor_data, null, 2)}</pre>
//   <pre>{JSON.stringify(credentials, null, 2)}</pre>

//   <button onClick={() => posli()}>Pošlji</button>
//   <button
//     onClick={() => {
//       resetStore();
//       router.push("/parametrs");
//     }}
//   >
//     test
//   </button>
// </div>
//   );
