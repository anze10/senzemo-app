import React, { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  List,
  ListItem,
  ListItemSecondaryAction,
  ListItemText,
  MenuItem,
  Select,
  Snackbar,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  Add as AddIcon,
  CheckCircle as CheckCircleIcon,
  Delete as DeleteIcon,
  Email as EmailIcon,
  Schedule as ScheduleIcon,
  Send as SendIcon,
  Settings as SettingsIcon,
} from "@mui/icons-material";
import { getInventorySummary } from "./report_generator";
import ScheduledReportManager from "./ScheduledReportManager";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import PreviewIcon from "@mui/icons-material/Preview";
import SummarizeIcon from "@mui/icons-material/Summarize";
// Remove this line from the top level
import {
  generateInventoryReport,
  previewInventoryReport,
} from "src/app/inventory/components/report_generator";
import { getLowComponents } from "./backent";

interface EmailRecipient {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface EmailSettings {
  isEnabled: boolean;
  dayOfMonth: number;
  recipients: EmailRecipient[];
  subject: string;
  includeReportUrl: boolean;
  lowStockThreshold: number;
}

const EmailReportManager: React.FC = () => {
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error" | "info" | "warning",
  });
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [activeTab, setActiveTab] = useState(0);
  const [settings, setSettings] = useState<EmailSettings>({
    isEnabled: false,
    dayOfMonth: 1,
    recipients: [],
    subject: "Monthly Inventory Report - {date}",
    includeReportUrl: true,
    lowStockThreshold: 5,
  });

  const [newRecipient, setNewRecipient] = useState({
    name: "",
    email: "",
    role: "",
  });

  const [isAddingRecipient, setIsAddingRecipient] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testSending, setTestSending] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [reportGenerating, setReportGenerating] = useState(false);
  const [reportPreviewLoading, setReportPreviewLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  // Add new recipient
  const handleAddRecipient = () => {
    if (newRecipient.name && newRecipient.email) {
      const recipient: EmailRecipient = {
        id: Date.now().toString(),
        ...newRecipient,
      };
      setSettings((prev) => ({
        ...prev,
        recipients: [...prev.recipients, recipient],
      }));
      setNewRecipient({ name: "", email: "", role: "" });
      setIsAddingRecipient(false);
    }
  };

  // Remove recipient
  const handleRemoveRecipient = (id: string) => {
    setSettings((prev) => ({
      ...prev,
      recipients: prev.recipients.filter((r) => r.id !== id),
    }));
  };

  // Send test email
  const handleSendTest = async () => {
    if (settings.recipients.length === 0) {
      setMessage({ type: "error", text: "Please add at least one recipient" });
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
          recipientEmails: settings.recipients.map((r) => r.email),
          recipientName: "Test User",
          reportDate: new Date().toLocaleDateString(),
          lowStockItems: summary.lowStockItems.length,
          reportUrl: settings.includeReportUrl
            ? `${window.location.origin}/inventory`
            : undefined,
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
      // Here you would typically save to your database
      // For now, we'll just simulate a save operation
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setMessage({
        type: "success",
        text: "Email settings saved successfully!",
      });
    } catch {
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
          <Tabs value={activeTab} onChange={handleTabChange} sx={{ mb: 3 }}>
            <Tab
              label="Email Settings"
              icon={<SettingsIcon />}
              iconPosition="start"
            />
            <Tab
              label="Schedule & History"
              icon={<ScheduleIcon />}
              iconPosition="start"
            />
          </Tabs>

          {activeTab === 0 ? (
            // Email Settings Tab
            <Box>
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

                      <Box display="flex" gap={2} alignItems="center">
                        <TextField
                          type="number"
                          label="Low Stock Threshold"
                          value={settings.lowStockThreshold}
                          onChange={(e) =>
                            setSettings((prev) => ({
                              ...prev,
                              lowStockThreshold: parseInt(e.target.value),
                            }))
                          }
                          size="small"
                          inputProps={{ min: 1, max: 100 }}
                          sx={{ width: 200 }}
                        />

                        <FormControlLabel
                          control={
                            <Switch
                              checked={settings.includeReportUrl}
                              onChange={(e) =>
                                setSettings((prev) => ({
                                  ...prev,
                                  includeReportUrl: e.target.checked,
                                }))
                              }
                              size="small"
                            />
                          }
                          label="Include report link"
                        />
                      </Box>
                    </Box>
                  </Box>

                  <Divider sx={{ my: 3 }} />

                  {/* Recipients Management */}
                  <Box mb={3}>
                    <Box
                      display="flex"
                      justifyContent="space-between"
                      alignItems="center"
                      mb={2}
                    >
                      <Typography variant="h6">
                        Email Recipients ({settings.recipients.length})
                      </Typography>
                      <Button
                        startIcon={<AddIcon />}
                        onClick={() => setIsAddingRecipient(true)}
                        variant="outlined"
                        size="small"
                      >
                        Add Recipient
                      </Button>
                    </Box>

                    {settings.recipients.length === 0 ? (
                      <Alert severity="info">
                        No recipients configured. Add at least one recipient to
                        enable email reports.
                      </Alert>
                    ) : (
                      <List>
                        {settings.recipients.map((recipient) => (
                          <ListItem key={recipient.id} divider>
                            <ListItemText
                              primary={recipient.name}
                              secondary={
                                <Box>
                                  <Typography variant="body2">
                                    {recipient.email}
                                  </Typography>
                                  {recipient.role && (
                                    <Chip
                                      label={recipient.role}
                                      size="small"
                                      sx={{ mt: 0.5 }}
                                    />
                                  )}
                                </Box>
                              }
                            />
                            <ListItemSecondaryAction>
                              <IconButton
                                edge="end"
                                onClick={() =>
                                  handleRemoveRecipient(recipient.id)
                                }
                                color="error"
                                size="small"
                              >
                                <DeleteIcon />
                              </IconButton>
                            </ListItemSecondaryAction>
                          </ListItem>
                        ))}
                      </List>
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
                      disabled={testSending || settings.recipients.length === 0}
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
            </Box>
          ) : (
            // Schedule & History Tab
            <ScheduledReportManager />
          )}

          {/* Add Recipient Dialog */}
          <Dialog
            open={isAddingRecipient}
            onClose={() => setIsAddingRecipient(false)}
            maxWidth="sm"
            fullWidth
          >
            <DialogTitle>Add Email Recipient</DialogTitle>
            <DialogContent>
              <Box display="flex" flexDirection="column" gap={2} mt={1}>
                <TextField
                  autoFocus
                  label="Full Name"
                  value={newRecipient.name}
                  onChange={(e) =>
                    setNewRecipient((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  fullWidth
                  required
                />
                <TextField
                  label="Email Address"
                  type="email"
                  value={newRecipient.email}
                  onChange={(e) =>
                    setNewRecipient((prev) => ({
                      ...prev,
                      email: e.target.value,
                    }))
                  }
                  fullWidth
                  required
                />
                <TextField
                  label="Role/Department"
                  value={newRecipient.role}
                  onChange={(e) =>
                    setNewRecipient((prev) => ({
                      ...prev,
                      role: e.target.value,
                    }))
                  }
                  fullWidth
                  placeholder="e.g., Manager, Admin, Analyst"
                />
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setIsAddingRecipient(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleAddRecipient}
                disabled={!newRecipient.name || !newRecipient.email}
                variant="contained"
              >
                Add Recipient
              </Button>
            </DialogActions>
          </Dialog>
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
    </Box>
  );
};

export default EmailReportManager;
