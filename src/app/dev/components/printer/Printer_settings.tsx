"use client";
import React, { useEffect, useState, useTransition } from "react";
import { getPrinterUrls, handlePrintRequest } from "./printer_server_side";
import type { Tiskalnik } from "./printer_server_side";
import { usePrinterStore } from "./printer_settinsgs_store";
import { Printer, TestTube } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  TextField,
  Typography,
  Checkbox,
  FormControlLabel,
} from "@mui/material";

interface PrinterSettingsProps {
  onClose: () => void;
}

const PrinterSettings: React.FC<PrinterSettingsProps> = ({ onClose }) => {
  const { printers, url_server, url_connection, setPrinters } =
    usePrinterStore();
  const [, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [manualUrlConnection, setManualUrlConnection] = useState(false);
  const [isPending, startTransition] = useTransition();
  const setSelectedPrinter = usePrinterStore(
    (state) => state.setSelectedPrinter
  );
  const selectedPrinter = usePrinterStore((state) => state.selectedPrinter);

  const handlePrintClick = async () => {
    if (!url_connection) {
      alert("Please select a printer or specify a URL connection.");
      return;
    }

    startTransition(async () => {
      try {
        console.log("Sending print job to:", url_connection);
        const result = await handlePrintRequest(url_connection);

        if (result.success) {
          alert("Print job sent successfully: " + result.message);
        } else {
          alert("Failed to send print job: " + result.message);
        }
      } catch (err) {
        alert("Failed to send print job. Check your connection.");
        console.error("Error sending print job:", err);
      }
    });
  };

  useEffect(() => {
    const fetchPrinters = async () => {
      try {
        const fetchedPrinters: Tiskalnik[] = await getPrinterUrls();
        setPrinters(fetchedPrinters, url_server, url_connection);
      } catch (error) {
        console.error("Error fetching printers:", error);
      }
    };
    void fetchPrinters();
  }, [setPrinters, url_server, url_connection]);

  // Update Zustand store when user selects a printer
  const handlePrinterSelect = (printerValue: string) => {
    console.log("Selected printer:", printerValue);
    setSelectedPrinter(`${url_server}/printers/${printerValue}`);
    if (!manualUrlConnection) {
      const updatedUrlConnection = `${url_server}/printers/${printerValue}`;
      setPrinters(printers, url_server, updatedUrlConnection);
    }
    setAnchorEl(null);
  };

  // Update Zustand store when user changes server URI
  const handleServerUriChange = (newUri: string) => {
    if (!manualUrlConnection) {
      const updatedUrlConnection = `${newUri}/printers/${selectedPrinter}`;
      setPrinters(printers, newUri, updatedUrlConnection);
    } else {
      setPrinters(printers, newUri, url_connection);
    }
  };

  // Update Zustand store or set manual override when user changes url_connection directly
  const handleUrlConnectionChange = (newUrlConnection: string) => {
    setPrinters(printers, url_server, newUrlConnection);
  };

  // Toggle manual URL connection mode
  const handleManualUrlConnectionToggle = (checked: boolean) => {
    setManualUrlConnection(checked);
    if (!checked) {
      const updatedUrlConnection = `${url_server}/printers/${selectedPrinter}`;
      setPrinters(printers, url_server, updatedUrlConnection);
    }
  };

  return (
    <Card className="w-[350px]">
      <CardHeader title="Printer Settings" />
      <CardContent>
        <div className="grid w-full items-center gap-4">
          <div className="flex flex-col space-y-1.5">
            <Typography variant="body1">Printer</Typography>
            {/* <Button
              variant="outlined"
              onClick={(e) => setAnchorEl(e.currentTarget)}
              endIcon={<ChevronsUpDown />}
              fullWidth
            >
              {selectedPrinter
                ? printers.find((printer) => printer.name === selectedPrinter)
                  ?.name
                : "Select printer..."}
            </Button> */}

            {/* printer.execute("Get-Printer-Attributes", { }, (err: Error, res: any) => {
            if (err) {
              console.error("Error getting printer attributes:", err);
            callback("Failed to get printer attributes");
            return;
            }

            const jobId = res?.["job-id"];
            if (!jobId) {
              console.error("No job-id found in response:", res);
            callback("Failed to get job-id");
            return;
            } */}

            <TextField
              select
              label="Select Printer"
              value={
                printers.find((printer) => `${url_server}/printers/${printer.name}` === selectedPrinter)
                  ?.name || ""
              }
              onChange={(e) => handlePrinterSelect(e.target.value)}
              fullWidth
              SelectProps={{
                native: true,
              }}
            >
              <option value="" disabled>
                Select printer...
              </option>
              {printers.map((printer) => (
                <option key={printer.name} value={printer.name}>
                  {printer.name}
                </option>
              ))}
            </TextField>
          </div>
          <div className="flex flex-col space-y-1.5">
            <Typography variant="body1">Printer Server URI</Typography>
            <TextField
              id="server-uri"
              value={url_server}
              onChange={(e) => handleServerUriChange(e.target.value)}
              fullWidth
            />
          </div>
          <FormControlLabel
            control={
              <Checkbox
                checked={manualUrlConnection}
                onChange={(e) =>
                  handleManualUrlConnectionToggle(e.target.checked)
                }
              />
            }
            label="Manual URL Connection"
          />
          {manualUrlConnection && (
            <div className="flex flex-col space-y-1.5">
              <Typography variant="body1">URL Connection</Typography>
              <TextField
                id="url-connection"
                value={url_connection}
                onChange={(e) => handleUrlConnectionChange(e.target.value)}
                fullWidth
              />
            </div>
          )}
          <Button
            variant="outlined"
            className="w-full"
            startIcon={<TestTube />}
            onClick={handlePrintClick}
            disabled={isPending}
          >
            {isPending ? "Sending Print Job..." : "Test Print"}
          </Button>
          <Button
            variant="contained"
            className="w-full mt-2"
            startIcon={<Printer />}
            onClick={onClose}
          >
            Save Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default PrinterSettings;
