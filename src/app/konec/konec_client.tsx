"use client";

import { useRouter } from "next/navigation";
import { RatedSensorData, useSensorStore } from "../dev/components/SensorStore";
import { useGoogleIDSstore } from "../parametrs/components/Credentisal";
import { Button, Card, CardContent, CardActions, Typography, Box, Paper, Divider } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { GetSensors } from "../sensors/components/backend";
import { Senzor } from "@prisma/client";
import { insert } from "~/server/GAPI_ACTION/create_folder";



export function Konec() {
  const { data: sensors } = useQuery({
    queryKey: ["sensors"],
    queryFn: () => GetSensors(),
  });
  const credentials = useGoogleIDSstore((state) => state.set_data);
  const sensor_data = useSensorStore((state) => state.sensors);
  const resetStore = useSensorStore((state) => state.reset);
  const router = useRouter();

  async function posli(sensor_data: RatedSensorData[], sensors: Senzor[] | undefined): Promise<void> {
    console.log("Pošiljam");
    console.log(sensor_data);

    if (!credentials?.fileId || !credentials?.spreadsheetId) {
      throw new Error("No credentials");
    }

    // Process each sensor individually
    for (const element of sensor_data.filter(el => el.okay)) {
      const sensorData = element.data;
      const custom_FW = "N/A";
      let freq_reg = "";
      let band_id = "";
      let Device_Type = "";
      let model_id = "";
      const lorawan_version = "RP001_V1_0_3_REV_A";

      // Find matching sensor details
      (sensors ?? []).forEach((sensor: Senzor) => {
        if (sensor.productId === sensorData.product_id && sensor.familyId === sensorData.family_id) {
          Device_Type = sensor.description ?? "We don't know";
          model_id = sensor.sensorName ?? "We don't know";
        }
      });

      // Determine frequency and band
      switch (sensorData.lora_freq_reg) {
        case "AS923":
          freq_reg = "AS_920_923_TTN_AU";
          band_id = "AS_923";
          break;
        case "EU868":
          freq_reg = "EU_863_870_TTN";
          band_id = "EU_863_870";
          break;
        case "US915":
          freq_reg = "US_902_928_FSB_2";
          band_id = "US_902_928";
          break;
      }

      // Build EXE and CSV rows for this sensor
      const newROWEXE: string[] = [
        model_id,
        String(sensorData.dev_eui),
        String(sensorData.app_key),
        String(sensorData.join_eui),
        freq_reg,
        "FSB2",
        String(sensorData.device_device_hw_ver),
        String(sensorData.device_fw_ver),
        custom_FW,
        String(sensorData.lora_send_period),
        String(sensorData.device_adc_delay),
        String(sensorData.device_mov_thr), // Fix typo if necessary
      ];

      const newRowCSV: string[] = [
        `${model_id}-${sensorData.dev_eui}`,
        String(sensorData.dev_eui),
        String(sensorData.join_eui),
        Device_Type,
        freq_reg,
        lorawan_version,
        "unknown",
        String(sensorData.app_key),
        "Senzemo",
        model_id,
        String(sensorData.device_device_hw_ver),
        String(sensorData.device_fw_ver),
        band_id,
      ];

      // Insert the row for this sensor
      await insert(
        credentials.fileId,
        newRowCSV,
        credentials.spreadsheetId,
        newROWEXE
      );
    }
  }

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