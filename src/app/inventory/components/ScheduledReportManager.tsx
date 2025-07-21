import React, { useEffect, useState } from "react";
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
  List,
  ListItem,
  ListItemText,
  Typography,
} from "@mui/material";
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  History as HistoryIcon,
  Info as InfoIcon,
  PlayArrow as PlayArrowIcon,
  Schedule as ScheduleIcon,
} from "@mui/icons-material";

interface ScheduledReport {
  id: string;
  nextRun: string;
  lastRun?: string;
  status: "active" | "inactive" | "error";
  recipients: string[];
  settings: {
    dayOfMonth: number;
    subject: string;
    includeReportUrl: boolean;
    lowStockThreshold: number;
  };
}

interface ReportHistory {
  id: string;
  date: string;
  status: "success" | "failed";
  recipientCount: number;
  errorMessage?: string;
  reportStats?: {
    totalSensors: number;
    totalComponents: number;
    lowStockItems: number;
  };
}

const ScheduledReportManager: React.FC = () => {
  const [scheduledReports, setScheduledReports] = useState<ScheduledReport[]>(
    [],
  );
  const [reportHistory, setReportHistory] = useState<ReportHistory[]>([]);
  const [testSending, setTestSending] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  // Load scheduled reports (mock data for now)
  useEffect(() => {
    const mockScheduledReports: ScheduledReport[] = [
      {
        id: "1",
        nextRun: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        lastRun: new Date(Date.now() - 23 * 24 * 60 * 60 * 1000).toISOString(),
        status: "active",
        recipients: ["admin@senzemo.com", "manager@senzemo.com"],
        settings: {
          dayOfMonth: 1,
          subject: "Monthly Inventory Report - {date}",
          includeReportUrl: true,
          lowStockThreshold: 5,
        },
      },
    ];

    const mockHistory: ReportHistory[] = [
      {
        id: "1",
        date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        status: "success",
        recipientCount: 2,
        reportStats: {
          totalSensors: 145,
          totalComponents: 87,
          lowStockItems: 3,
        },
      },
      {
        id: "2",
        date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
        status: "success",
        recipientCount: 2,
        reportStats: {
          totalSensors: 138,
          totalComponents: 92,
          lowStockItems: 5,
        },
      },
    ];

    setScheduledReports(mockScheduledReports);
    setReportHistory(mockHistory);
  }, []);

  const handleSendTestReport = async () => {
    setTestSending(true);
    try {
      const response = await fetch("/api/send-monthly-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipients: ["admin@senzemo.com"],
          subject: "[TEST] Monthly Inventory Report",
          includeReportUrl: true,
          lowStockThreshold: 5,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setMessage({ type: "success", text: "Test report sent successfully!" });
      } else {
        setMessage({
          type: "error",
          text: result.error || "Failed to send test report",
        });
      }
    } catch {
      setMessage({
        type: "error",
        text: "Network error while sending test report",
      });
    } finally {
      setTestSending(false);
    }
  };

  const getStatusColor = (
    status: string,
  ): "success" | "warning" | "error" | "default" => {
    switch (status) {
      case "active":
        return "success";
      case "inactive":
        return "warning";
      case "error":
        return "error";
      default:
        return "default";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <CheckCircleIcon color="success" />;
      case "inactive":
        return <InfoIcon color="warning" />;
      case "error":
        return <ErrorIcon color="error" />;
      default:
        return <InfoIcon />;
    }
  };

  return (
    <Box sx={{ maxWidth: 1000, margin: "auto", padding: 2 }}>
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

      {/* Active Scheduled Reports */}
      <Card sx={{ mb: 3 }}>
        <CardHeader
          title={
            <Box display="flex" alignItems="center" gap={1}>
              <ScheduleIcon color="primary" />
              <Typography variant="h6">Scheduled Reports</Typography>
            </Box>
          }
          action={
            <Button
              variant="outlined"
              startIcon={
                testSending ? <CircularProgress size={16} /> : <PlayArrowIcon />
              }
              onClick={handleSendTestReport}
              disabled={testSending}
            >
              {testSending ? "Sending..." : "Send Test Report"}
            </Button>
          }
        />
        <CardContent>
          {scheduledReports.length === 0 ? (
            <Alert severity="info">
              No scheduled reports configured. Use the Email Reports tab to set
              up automated reports.
            </Alert>
          ) : (
            <List>
              {scheduledReports.map((report) => (
                <ListItem key={report.id} divider>
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1}>
                        {getStatusIcon(report.status)}
                        <Typography variant="body1">
                          Monthly Report - Day {report.settings.dayOfMonth}
                        </Typography>
                        <Chip
                          label={report.status}
                          color={getStatusColor(report.status)}
                          size="small"
                        />
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2">
                          Recipients: {report.recipients.join(", ")}
                        </Typography>
                        <Typography variant="body2">
                          Next run:{" "}
                          {new Date(report.nextRun).toLocaleDateString()}
                        </Typography>
                        {report.lastRun && (
                          <Typography variant="body2">
                            Last run:{" "}
                            {new Date(report.lastRun).toLocaleDateString()}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          )}
        </CardContent>
      </Card>

      {/* Report History */}
      <Card>
        <CardHeader
          title={
            <Box display="flex" alignItems="center" gap={1}>
              <HistoryIcon color="primary" />
              <Typography variant="h6">Recent Reports</Typography>
            </Box>
          }
          action={
            <Button
              variant="outlined"
              onClick={() => setHistoryDialogOpen(true)}
            >
              View All History
            </Button>
          }
        />
        <CardContent>
          {reportHistory.length === 0 ? (
            <Alert severity="info">No report history available yet.</Alert>
          ) : (
            <List>
              {reportHistory.slice(0, 5).map((report) => (
                <ListItem key={report.id} divider>
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1}>
                        {report.status === "success" ? (
                          <CheckCircleIcon color="success" />
                        ) : (
                          <ErrorIcon color="error" />
                        )}
                        <Typography variant="body1">
                          {new Date(report.date).toLocaleDateString()}
                        </Typography>
                        <Chip
                          label={report.status}
                          color={
                            report.status === "success" ? "success" : "error"
                          }
                          size="small"
                        />
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2">
                          Sent to {report.recipientCount} recipient(s)
                        </Typography>
                        {report.reportStats && (
                          <Typography variant="body2">
                            {report.reportStats.totalSensors} sensors,{" "}
                            {report.reportStats.totalComponents} components,{" "}
                            {report.reportStats.lowStockItems} low stock
                          </Typography>
                        )}
                        {report.errorMessage && (
                          <Typography variant="body2" color="error">
                            Error: {report.errorMessage}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          )}
        </CardContent>
      </Card>

      {/* History Dialog */}
      <Dialog
        open={historyDialogOpen}
        onClose={() => setHistoryDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Complete Report History</DialogTitle>
        <DialogContent>
          <List>
            {reportHistory.map((report) => (
              <ListItem key={report.id} divider>
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={1}>
                      {report.status === "success" ? (
                        <CheckCircleIcon color="success" />
                      ) : (
                        <ErrorIcon color="error" />
                      )}
                      <Typography variant="body1">
                        {new Date(report.date).toLocaleString()}
                      </Typography>
                      <Chip
                        label={report.status}
                        color={
                          report.status === "success" ? "success" : "error"
                        }
                        size="small"
                      />
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography variant="body2">
                        Sent to {report.recipientCount} recipient(s)
                      </Typography>
                      {report.reportStats && (
                        <Typography variant="body2">
                          Stats: {report.reportStats.totalSensors} sensors,{" "}
                          {report.reportStats.totalComponents} components,{" "}
                          {report.reportStats.lowStockItems} low stock
                        </Typography>
                      )}
                      {report.errorMessage && (
                        <Typography variant="body2" color="error">
                          Error: {report.errorMessage}
                        </Typography>
                      )}
                    </Box>
                  }
                />
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ScheduledReportManager;
