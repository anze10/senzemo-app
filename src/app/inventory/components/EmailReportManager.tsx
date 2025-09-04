import React, { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  CircularProgress,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Snackbar,
  Switch,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  CheckCircle as CheckCircleIcon,
  Email as EmailIcon,
  Schedule as ScheduleIcon,
  Send as SendIcon,
  Settings as SettingsIcon,
} from "@mui/icons-material";
import { getInventorySummary } from "./report_generator";

import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import PreviewIcon from "@mui/icons-material/Preview";
import SummarizeIcon from "@mui/icons-material/Summarize";
import {
  generateInventoryReport,
  previewInventoryReport,
} from "src/app/inventory/components/report_generator";
import { getEmailSettings, UpdateOrSetEmailSettings } from "./EmailsBackend";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export interface EmailSettings {
  isEnabled: boolean;
  dayOfMonth: number;
  subject: string;
  userEmail?: string;
  userName?: string;
}

const EmailReportManager: React.FC = () => {
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error" | "info" | "warning",
  });
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [settings, setSettings] = useState<EmailSettings>({
    isEnabled: false,
    dayOfMonth: 1,
    subject: "Monthly Inventory Report - {date}",
  });

  const [loading, setLoading] = useState(false);
  const [testSending, setTestSending] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [reportGenerating, setReportGenerating] = useState(false);
  const [reportPreviewLoading, setReportPreviewLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const { data: currentSettings, isLoading: settingsLoading } = useQuery({
    queryKey: ["emailSettings"],
    queryFn: async () => await getEmailSettings(),
  });

  const queryClient = useQueryClient();

  // Update local settings when currentSettings changes
  React.useEffect(() => {
    if (currentSettings) {
      setSettings(currentSettings);
    }
  }, [currentSettings]);

  // Send test email
  const handleSendTest = async () => {
    if (!settings.userEmail) {
      setMessage({
        type: "error",
        text: "Uporabniški e-poštni naslov ni najden. Preverite, ali ste prijavljeni.",
      });
      return;
    }

    setTestSending(true);
    try {
      // Get real inventory data for test
      const summary = await getInventorySummary();

      const response = await fetch("/api/send-inventory-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientEmails: [settings.userEmail], // Send to current user only
          recipientName: settings.userName || "User",
          reportDate: new Date().toLocaleDateString(),
          lowStockItems: summary.lowStockItems.length,
          subject: `[TEST] ${settings.subject.replace("{date}", new Date().toLocaleDateString())}`,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setMessage({ type: "success", text: "Testno e-poštno sporočilo je bilo uspešno poslano!" });
      } else {
        setMessage({
          type: "error",
          text: result.error || "Pošiljanje testnega e-poštnega sporočila ni uspelo",
        });
      }
    } catch {
      setMessage({
        type: "error",
        text: "Napaka omrežja pri pošiljanju testnega e-poštnega sporočila",
      });
    } finally {
      setTestSending(false);
    }
  };

  // Save settings
  const handleSaveSettings = async () => {
    setLoading(true);
    try {
      await UpdateOrSetEmailSettings(
        settings.isEnabled,
        settings.dayOfMonth,
        settings.subject,
      );
      setMessage({
        type: "success",
        text: "Nastavitve e-pošte so bile uspešno shranjene!",
      });
      // Refresh the settings from backend
      queryClient.invalidateQueries({ queryKey: ["emailSettings"] });
    } catch (error) {
      console.error("Error saving settings:", error);
      setMessage({ type: "error", text: "Shranjevanje nastavitev ni uspelo" });
    } finally {
      setLoading(false);
    }
  };
  const handleGenerateReport = async () => {
    setReportGenerating(true);
    try {
      await generateInventoryReport();
      setSnackbar({
        open: true,
        message: "Poročilo o zalogi je bilo uspešno ustvarjeno!",
        severity: "success",
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Ustvarjanje poročila ni uspelo: " + (error as Error).message,
        severity: "error",
      });
    } finally {
      setReportGenerating(false);
    }
  };

  const handlePreviewReport = async () => {
    setReportPreviewLoading(true);
    try {
      await previewInventoryReport();
      setSnackbar({
        open: true,
        message: "Predogled poročila je odprt v novem zavihku",
        severity: "success",
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Predogled poročila ni uspel: " + (error as Error).message,
        severity: "error",
      });
    } finally {
      setReportPreviewLoading(false);
    }
  };

  const handleSummaryPreview = async () => {
    setSummaryLoading(true);
    try {
      const summary = await getInventorySummary();
      setSnackbar({
        open: true,
        message: `Povzetek: ${summary.totalSensors} senzorjev, ${summary.totalComponents} komponent, ${summary.lowStockCount} artiklov z nizko zalogo`,
        severity: "info",
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Pridobivanje povzetka ni uspelo: " + (error as Error).message,
        severity: "error",
      });
    } finally {
      setSummaryLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 1200, margin: "auto" }}>
      {settingsLoading ? (
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="200px"
        >
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: { xs: "center", md: "flex-end" },
              gap: 2,
              width: { xs: "100%", md: "auto" },
            }}
          >
            <Box
              sx={{
                display: "flex",
                flexDirection: { xs: "column", md: "row" },
                alignItems: "stretch",
                gap: { xs: 1, md: 2 },
                width: { xs: "100%", md: "auto" },
              }}
            >
              <Button
                variant="contained"
                color="primary"
                startIcon={
                  reportGenerating ? (
                    <CircularProgress size={20} color="inherit" />
                  ) : (
                    <PictureAsPdfIcon />
                  )
                }
                onClick={handleGenerateReport}
                disabled={reportGenerating}
                size={isMobile ? "large" : "medium"}
                fullWidth={isMobile}
                sx={{ minHeight: 44 }}
              >
                {reportGenerating
                  ? "Ustvarjanje..."
                  : isMobile
                    ? "Ustvari PDF"
                    : "Ustvari poročilo"}
              </Button>

              <Button
                variant="outlined"
                color="primary"
                startIcon={
                  reportPreviewLoading ? (
                    <CircularProgress size={20} color="inherit" />
                  ) : (
                    <PreviewIcon />
                  )
                }
                onClick={handlePreviewReport}
                disabled={reportPreviewLoading}
                size={isMobile ? "large" : "medium"}
                fullWidth={isMobile}
                sx={{ minHeight: 44 }}
              >
                {reportPreviewLoading ? "Nalaganje..." : "Predogled"}
              </Button>

              <Button
                variant="text"
                color="primary"
                startIcon={
                  summaryLoading ? (
                    <CircularProgress size={20} color="inherit" />
                  ) : (
                    <SummarizeIcon />
                  )
                }
                onClick={handleSummaryPreview}
                disabled={summaryLoading}
                size={isMobile ? "large" : "medium"}
                fullWidth={isMobile}
                sx={{ minHeight: 44 }}
              >
                {summaryLoading ? "Nalaganje..." : "Povzetek"}
              </Button>
            </Box>

            {!isMobile && (
              <Typography
                variant="caption"
                color="textSecondary"
                sx={{ textAlign: "center" }}
              >
                Profesionalna poročila o zalogi
              </Typography>
            )}
          </Box>
          <Card>
            <CardHeader
              title={
                <Box display="flex" alignItems="center" gap={1}>
                  <EmailIcon color="primary" />
                  <Typography variant="h6">Mesečna e-poštna poročila</Typography>
                </Box>
              }
              subheader="Nastavite in upravljajte samodejna mesečna poročila o zalogi"
            />

            <CardContent>
              {/* Alert Messages */}
              {message && (
                <Alert
                  severity={message.type}
                  onClose={() => setMessage(null)}
                  sx={{ mb: 2 }}
                >
                  {message.text}
                </Alert>
              )}

              {/* Enable/Disable Toggle */}
              <Box mb={3}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.isEnabled}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          isEnabled: e.target.checked,
                        }))
                      }
                      color="primary"
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body1">
                        Omogoči mesečna poročila
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        Samodejno pošiljaj poročila o zalogi vsak mesec
                      </Typography>
                    </Box>
                  }
                />
              </Box>

              {settings.isEnabled && (
                <>
                  {/* Schedule Settings */}
                  <Box mb={3}>
                    <Typography variant="h6" gutterBottom>
                      <ScheduleIcon sx={{ mr: 1, verticalAlign: "middle" }} />
                      Nastavitve urnika
                    </Typography>

                    <Box
                      display="flex"
                      gap={2}
                      alignItems="center"
                      flexWrap="wrap"
                    >
                      <FormControl size="small" sx={{ minWidth: 200 }}>
                        <InputLabel>Dan v mesecu</InputLabel>
                        <Select
                          value={settings.dayOfMonth}
                          onChange={(e) =>
                            setSettings((prev) => ({
                              ...prev,
                              dayOfMonth: e.target.value as number,
                            }))
                          }
                          label="Dan v mesecu"
                        >
                          {Array.from({ length: 28 }, (_, i) => (
                            <MenuItem key={i + 1} value={i + 1}>
                              {i + 1}
                              {i === 0
                                ? "st"
                                : i === 1
                                  ? "nd"
                                  : i === 2
                                    ? "rd"
                                    : "th"}{" "}
                              dan
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>

                      <Typography variant="body2" color="textSecondary">
                        Poročila bodo poslana {settings.dayOfMonth}. dan v vsakem mesecu
                      </Typography>
                    </Box>
                  </Box>

                  {/* Email Configuration */}
                  <Box mb={3}>
                    <Typography variant="h6" gutterBottom>
                      <SettingsIcon sx={{ mr: 1, verticalAlign: "middle" }} />
                      Nastavitve e-pošte
                    </Typography>

                    <Box display="flex" flexDirection="column" gap={2}>
                      <TextField
                        fullWidth
                        label="Zadeva e-pošte"
                        value={settings.subject}
                        onChange={(e) =>
                          setSettings((prev) => ({
                            ...prev,
                            subject: e.target.value,
                          }))
                        }
                        helperText="Uporabite {date} za samodejni vnos datuma"
                        size="small"
                      />
                    </Box>
                  </Box>

                  {/* User Email Info Section */}
                  <Box mb={3}>
                    <Typography variant="h6" gutterBottom>
                      <EmailIcon sx={{ mr: 1, verticalAlign: "middle" }} />
                      Prejemnik e-pošte
                    </Typography>

                    {settings.userEmail ? (
                      <Alert severity="info" sx={{ mb: 2 }}>
                        <Box>
                          <Typography variant="body2" fontWeight={500}>
                            {settings.userEmail}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            Poročila bodo poslana na vaš registriran e-poštni naslov
                          </Typography>
                        </Box>
                      </Alert>
                    ) : (
                      <Alert severity="warning" sx={{ mb: 2 }}>
                        E-poštni naslov ni najden. Preverite, ali ste pravilno prijavljeni.
                      </Alert>
                    )}
                  </Box>

                  {/* Action Buttons */}
                  <Box
                    display="flex"
                    gap={2}
                    justifyContent="flex-end"
                    flexWrap="wrap"
                  >
                    <Button
                      onClick={handleSendTest}
                      startIcon={
                        testSending ? (
                          <CircularProgress size={16} />
                        ) : (
                          <SendIcon />
                        )
                      }
                      variant="outlined"
                    >
                      {testSending ? "Pošiljanje..." : "Pošlji testno e-pošto"}
                    </Button>

                    <Button
                      onClick={handleSaveSettings}
                      startIcon={
                        loading ? (
                          <CircularProgress size={16} />
                        ) : (
                          <CheckCircleIcon />
                        )
                      }
                      disabled={loading}
                      variant="contained"
                    >
                      {loading ? "Shranjevanje..." : "Shrani nastavitve"}
                    </Button>
                  </Box>
                </>
              )}
            </CardContent>
          </Card>
          <Snackbar
            open={snackbar.open}
            autoHideDuration={6000}
            onClose={() => setSnackbar({ ...snackbar, open: false })}
            anchorOrigin={{ vertical: "top", horizontal: "center" }}
          >
            <Alert
              onClose={() => setSnackbar({ ...snackbar, open: false })}
              severity={snackbar.severity}
              sx={{ width: "100%" }}
            >
              {snackbar.message}
            </Alert>
          </Snackbar>
        </>
      )}
    </Box>
  );
};

export default EmailReportManager;
