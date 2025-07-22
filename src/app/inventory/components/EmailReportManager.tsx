import React, { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  CircularProgress,
  Divider,
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
        text: "User email not found. Please ensure you're logged in.",
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
        setMessage({ type: "success", text: "Test email sent successfully!" });
      } else {
        setMessage({
          type: "error",
          text: result.error || "Failed to send test email",
        });
      }
    } catch {
      setMessage({
        type: "error",
        text: "Network error while sending test email",
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
        text: "Email settings saved successfully!",
      });
      // Refresh the settings from backend
      queryClient.invalidateQueries({ queryKey: ["emailSettings"] });
    } catch (error) {
      console.error("Error saving settings:", error);
      setMessage({ type: "error", text: "Failed to save settings" });
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
        message: "Inventory report generated successfully!",
        severity: "success",
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Failed to generate report: " + (error as Error).message,
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
        message: "Report preview opened in new tab",
        severity: "success",
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Failed to preview report: " + (error as Error).message,
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
        message: `Summary: ${summary.totalSensors} sensors, ${summary.totalComponents} components, ${summary.lowStockCount} low stock items`,
        severity: "info",
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Failed to get summary: " + (error as Error).message,
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
                  ? "Generating..."
                  : isMobile
                    ? "Generate PDF"
                    : "Generate Report"}
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
                {reportPreviewLoading ? "Loading..." : "Preview"}
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
                {summaryLoading ? "Loading..." : "Summary"}
              </Button>
            </Box>

            {!isMobile && (
              <Typography
                variant="caption"
                color="textSecondary"
                sx={{ textAlign: "center" }}
              >
                Professional inventory reports
              </Typography>
            )}
          </Box>
          <Card>
            <CardHeader
              title={
                <Box display="flex" alignItems="center" gap={1}>
                  <EmailIcon color="primary" />
                  <Typography variant="h6">Monthly Email Reports</Typography>
                </Box>
              }
              subheader="Configure and manage automated monthly inventory reports"
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
                        Enable Monthly Reports
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        Automatically send inventory reports every month
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
                      Schedule Settings
                    </Typography>

                    <Box
                      display="flex"
                      gap={2}
                      alignItems="center"
                      flexWrap="wrap"
                    >
                      <FormControl size="small" sx={{ minWidth: 200 }}>
                        <InputLabel>Day of Month</InputLabel>
                        <Select
                          value={settings.dayOfMonth}
                          onChange={(e) =>
                            setSettings((prev) => ({
                              ...prev,
                              dayOfMonth: e.target.value as number,
                            }))
                          }
                          label="Day of Month"
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
                              day
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>

                      <Typography variant="body2" color="textSecondary">
                        Reports will be sent on the {settings.dayOfMonth}
                        {settings.dayOfMonth === 1
                          ? "st"
                          : settings.dayOfMonth === 2
                            ? "nd"
                            : settings.dayOfMonth === 3
                              ? "rd"
                              : "th"}{" "}
                        of each month
                      </Typography>
                    </Box>
                  </Box>

                  {/* Email Configuration */}
                  <Box mb={3}>
                    <Typography variant="h6" gutterBottom>
                      <SettingsIcon sx={{ mr: 1, verticalAlign: "middle" }} />
                      Email Configuration
                    </Typography>

                    <Box display="flex" flexDirection="column" gap={2}>
                      <TextField
                        fullWidth
                        label="Email Subject"
                        value={settings.subject}
                        onChange={(e) =>
                          setSettings((prev) => ({
                            ...prev,
                            subject: e.target.value,
                          }))
                        }
                        helperText="Use {date} placeholder for automatic date insertion"
                        size="small"
                      />
                    </Box>
                  </Box>

                  {/* User Email Info Section */}
                  <Box mb={3}>
                    <Typography variant="h6" gutterBottom>
                      <EmailIcon sx={{ mr: 1, verticalAlign: "middle" }} />
                      Email Recipient
                    </Typography>

                    {settings.userEmail ? (
                      <Alert severity="info" sx={{ mb: 2 }}>
                        <Box>
                          <Typography variant="body2" fontWeight={500}>
                            {settings.userEmail}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            Reports will be sent to your registered email
                            address
                          </Typography>
                        </Box>
                      </Alert>
                    ) : (
                      <Alert severity="warning" sx={{ mb: 2 }}>
                        Email address not found. Please ensure you're logged in
                        properly.
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
                      {testSending ? "Sending..." : "Send Test Email"}
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
                      {loading ? "Saving..." : "Save Settings"}
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
