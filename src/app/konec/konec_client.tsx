"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  type RatedSensorData,
  useSensorStore,
} from "../dev/components/SensorStore";
import { useGoogleIDSstore } from "../parametrs/components/Credentisal";
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  LinearProgress,
  List,
  ListItem,
  //ListItemIcon,
  ListItemText,
  Paper,
  Typography,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { GetSensors } from "../sensors/components/backend";
import type { Senzor } from "@prisma/client";
import { insert } from "~/server/GAPI_ACTION/create_folder";
import { CheckCircleIcon } from "lucide-react";
import { XCircleIcon } from "lucide-react";
import dynamic from "next/dynamic";

const UsedTime = dynamic(
  () =>
    import("./used_time").then(
      (mod: typeof import("src/app/konec/used_time")) => mod.get_used_time,
    ),
  { ssr: false },
);

// SensorReport Component
interface SensorReportProps {
  sensorData: RatedSensorData[];
  startTime?: Date;
}

function SensorReport({ sensorData }: SensorReportProps) {
  // Calculate statistics
  const totalSensors = sensorData.length;
  const successfulSensors = sensorData.filter((sensor) => sensor.okay).length;
  const unsuccessfulSensors = sensorData.filter(
    (sensor) => !sensor.okay,
  ).length;
  const failedSensors = totalSensors - successfulSensors;

  return (
    <Card sx={{ maxWidth: 800, margin: "auto", mt: 4 }}>
      <CardContent>
        <Typography variant="h4" component="div" gutterBottom align="center">
          Poročilo o testiranju senzorjev
        </Typography>

        {/* Statistics */}
        <Paper elevation={3} sx={{ p: 2, mb: 3, bgcolor: "#f8f9fa" }}>
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", md: "row" },
              gap: 2,
            }}
          >
            <Box sx={{ flex: 1, textAlign: "center" }}>
              <Typography variant="h6">Skupaj senzorjev</Typography>
              <Typography variant="h3">{totalSensors}</Typography>
            </Box>
            <Box sx={{ flex: 1, textAlign: "center" }}>
              <Typography variant="h6">Uspešno</Typography>
              <Typography variant="h3" color="success.main">
                {successfulSensors}
              </Typography>
            </Box>
            <Box sx={{ flex: 1, textAlign: "center" }}>
              <Typography variant="h6">Neuspešno</Typography>
              <Typography variant="h3" color="red">
                {unsuccessfulSensors}
              </Typography>
            </Box>
          </Box>
        </Paper>

        <Divider sx={{ my: 2 }} />

        {/* Sensor List */}
        <Typography variant="h5" gutterBottom>
          Seznam testiranih senzorjev
        </Typography>

        <List sx={{ bgcolor: "background.paper" }}>
          {sensorData.map((sensor, index) => (
            <ListItem
              key={index}
              divider={index < sensorData.length - 1}
              secondaryAction={
                sensor.okay ? (
                  <CheckCircleIcon className="h-6 w-6 text-green-500" />
                ) : (
                  <XCircleIcon className="h-6 w-6 text-red-500" />
                )
              }
            >
              <ListItemText
                primary={
                  <Typography variant="body1">
                    Senzor-{sensor.data.dev_eui || `${index + 1}`}
                  </Typography>
                }
                secondary={
                  <Typography variant="body2" color="text.secondary">
                    {sensor.data.product_id && sensor.data.family_id
                      ? `ID: ${sensor.data.product_id}-${sensor.data.family_id}`
                      : "Ni ID podatkov"}
                  </Typography>
                }
              />
            </ListItem>
          ))}

          {sensorData.length === 0 && (
            <ListItem>
              <ListItemText
                primary="Ni testiranih senzorjev"
                secondary="Začnite testiranje senzorjev za prikaz rezultatov"
              />
            </ListItem>
          )}
        </List>

        {/* Summary */}
        <Box sx={{ mt: 3, display: "flex", justifyContent: "center", gap: 2 }}>
          <Chip
            label={`Uspešno: ${successfulSensors}`}
            color="success"
            variant="outlined"
          />
          {failedSensors > 0 && (
            <Chip
              label={`Neuspešno: ${failedSensors}`}
              color="error"
              variant="outlined"
            />
          )}
          <UsedTime />
        </Box>
      </CardContent>
    </Card>
  );
}

interface UploadProgress {
  current: number;
  total: number;
  currentDevEui: string;
  status: "idle" | "uploading" | "done" | "error";
  errorMessage?: string;
}

// Main Konec Component
export function Konec() {
  const { data: sensors } = useQuery({
    queryKey: ["sensors"],
    queryFn: () => GetSensors(),
  });
  const credentials = useGoogleIDSstore((state) => state.set_data);
  const sensor_data = useSensorStore((state) => state.sensors);
  const resetStore = useSensorStore((state) => state.reset);
  const router = useRouter();
  const [dataAdded, setDataAdded] = useState(false);

  const [progress, setProgress] = useState<UploadProgress>({
    current: 0,
    total: 0,
    currentDevEui: "",
    status: "idle",
  });

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dataAdded) {
        event.preventDefault();
        event.returnValue = ""; // Standard for most browsers
        return ""; // For some older browsers
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [dataAdded]);

  async function posli(
    sensor_data: RatedSensorData[],
    sensors: Senzor[] | undefined,
  ): Promise<void> {
    console.log("Pošiljam");
    console.log(sensor_data);

    if (!credentials?.fileId || !credentials?.spreadsheetId) {
      throw new Error("No credentials");
    }

    const validSensors = sensor_data.filter((el) => el.okay);

    setProgress({
      current: 0,
      total: validSensors.length,
      currentDevEui: "",
      status: "uploading",
    });

    // Process each sensor individually
    for (let i = 0; i < validSensors.length; i++) {
      const element = validSensors[i]!;
      const sensorData = element.data;
      const custom_FW = "N/A";
      let freq_reg = "";
      let band_id = "";
      let Device_Type = "";
      let model_id = "";
      const lorawan_version = "RP001_V1_0_3_REV_A";

      setProgress((prev) => ({
        ...prev,
        current: i,
        currentDevEui: String(sensorData.dev_eui ?? `#${i + 1}`),
      }));

      // Find matching sensor details
      (sensors ?? []).forEach((sensor: Senzor) => {
        if (
          sensor.productId === sensorData.product_id &&
          sensor.familyId === sensorData.family_id
        ) {
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

      try {
        // Insert the row for this sensor
        await insert(
          credentials.fileId,
          newRowCSV,
          credentials.spreadsheetId,
          newROWEXE,
        );
      } catch (err) {
        setProgress((prev) => ({
          ...prev,
          status: "error",
          errorMessage: `Napaka pri pošiljanju senzorja ${sensorData.dev_eui}: ${(err as Error).message
            }`,
        }));
        return; // ustavi ob prvi napaki, ne nadaljuj tiho
      }

      setProgress((prev) => ({
        ...prev,
        current: i + 1,
      }));
    }

    setProgress((prev) => ({ ...prev, status: "done" }));
    setDataAdded(true); // Mark data as added
  }

  const progressPercent =
    progress.total > 0 ? (progress.current / progress.total) * 100 : 0;

  return (
    <Box sx={{ maxWidth: 800, margin: "auto", mt: 4 }}>
      {/* Sensor Report Component */}
      <SensorReport sensorData={sensor_data} />
      <CardActions sx={{ justifyContent: "space-between", p: 2 }}>
        <Button
          variant="contained"
          color="primary"
          disabled={progress.status === "uploading"}
          onClick={async () => {
            await posli(sensor_data, sensors);
            if (progress.status !== "error") {
              resetStore();
            }
          }}
        >
          Dodaj podatke v drive
        </Button>
        <Button
          variant="outlined"
          color="secondary"
          disabled={progress.status === "uploading"}
          onClick={() => {
            resetStore();
            router.push("/parametrs");
          }}
        >
          Reset and Go Back
        </Button>
        <Button
          variant="outlined"
          disabled={progress.status === "uploading"}
          onClick={() => posli(sensor_data, sensors)}
        >
          Test z TTN
        </Button>
      </CardActions>

      {/* Progress dialog - blokira zapiranje med pošiljanjem */}
      <Dialog
        open={progress.status === "uploading" || progress.status === "error"}
        onClose={() => { }}
        disableEscapeKeyDown
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {progress.status === "error"
            ? "Napaka pri pošiljanju"
            : "Pošiljam podatke na Google Drive..."}
        </DialogTitle>
        <DialogContent>
          {progress.status === "uploading" && (
            <>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Senzor {progress.current + 1} od {progress.total}
                {progress.currentDevEui && ` (${progress.currentDevEui})`}
              </Typography>
              <LinearProgress
                variant="determinate"
                value={progressPercent}
                sx={{ height: 10, borderRadius: 1 }}
              />
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mt: 1, display: "block" }}
              >
                {Math.round(progressPercent)}% končano
              </Typography>
            </>
          )}

          {progress.status === "error" && (
            <>
              <Typography color="error" sx={{ mb: 2 }}>
                {progress.errorMessage}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Poslano {progress.current} od {progress.total} senzorjev pred
                napako.
              </Typography>
              <Box sx={{ mt: 2, display: "flex", justifyContent: "flex-end" }}>
                <Button
                  variant="contained"
                  onClick={() =>
                    setProgress({
                      current: 0,
                      total: 0,
                      currentDevEui: "",
                      status: "idle",
                    })
                  }
                >
                  V redu
                </Button>
              </Box>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Success dialog */}
      <Dialog
        open={progress.status === "done"}
        onClose={() =>
          setProgress({ current: 0, total: 0, currentDevEui: "", status: "idle" })
        }
        maxWidth="xs"
        fullWidth
      >
        <DialogContent sx={{ textAlign: "center", py: 4 }}>
          <CheckCircleIcon className="mx-auto mb-2 h-12 w-12 text-green-500" />
          <Typography variant="h6" gutterBottom>
            Podatki uspešno poslani!
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Vseh {progress.total} senzorjev je bilo dodanih v Google Drive.
          </Typography>
          <Button
            variant="contained"
            onClick={() =>
              setProgress({
                current: 0,
                total: 0,
                currentDevEui: "",
                status: "idle",
              })
            }
          >
            V redu
          </Button>
        </DialogContent>
      </Dialog>
    </Box>
  );
}