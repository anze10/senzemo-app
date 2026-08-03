"use client";
import React, { useEffect, useState, useTransition } from "react";
import { usePrinterStore } from "src/app/dev/components/printer/printer_settinsgs_store";

// Extend Window type to include electronAPI provided by Electron preload script


import { Printer, TestTube } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  FormControlLabel,
  Radio,
  RadioGroup,
  TextField,
  Typography,
} from "@mui/material";

interface PrinterSettingsProps {
  onClose: () => void;
}

const TEST_ZPL = "^XA^FO50,50^ADN,36,20^FDTest nalepka^FS^XZ";

const PrinterSettings: React.FC<PrinterSettingsProps> = ({ onClose }) => {
  const [isElectron, setIsElectron] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [connectionType, setConnectionType] = useState<"system" | "raw">(
    "system",
  );
  const [networkHost, setNetworkHost] = useState("");

  const localPrinters = usePrinterStore((s) => s.localPrinters);
  const selectedPrinter = usePrinterStore((s) => s.selectedPrinter);
  const setLocalPrinters = usePrinterStore((s) => s.setLocalPrinters);
  const selectSystemPrinter = usePrinterStore((s) => s.selectSystemPrinter);
  const selectRawPrinter = usePrinterStore((s) => s.selectRawPrinter);

  // zaznaj Electron okolje šele po mountu (izogib SSR/hydration napakam)
  useEffect(() => {
    setIsElectron(typeof window !== "undefined" && !!window.electronAPI);
  }, []);

  // ob vstopu v Electron - pridobi OS-registrirane tiskalnike
  useEffect(() => {
    if (!isElectron) return;
    window.electronAPI!.listPrinters().then(setLocalPrinters);
  }, [isElectron, setLocalPrinters]);

  const handleTestPrint = () => {
    if (!window.electronAPI || !selectedPrinter) {
      alert("Izberi tiskalnik pred testnim tiskom.");
      return;
    }

    startTransition(async () => {
      try {
        await window.electronAPI!.printZpl(selectedPrinter, TEST_ZPL);
        alert("Testna nalepka poslana na tiskalnik.");
      } catch (err) {
        alert(`Napaka pri tiskanju: ${(err as Error).message}`);
        console.error("Napaka pri tiskanju:", err);
      }
    });
  };

  // --- Web (brez Electrona) - tiskanje ni na voljo ---
  if (!isElectron) {
    return (
      <Card className="w-87.5">
        <CardHeader title="Nastavitve tiskalnika" />
        <CardContent>
          <Typography color="text.secondary">
            Tiskanje nalepk je na voljo samo v namizni aplikaciji. Prenesi
            in zaženi namizno (Electron) verzijo za dostop do te funkcije.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  // --- Electron - poln tiskalniški UI ---
  return (
    <Card className="w-87.5">
      <CardHeader title="Nastavitve tiskalnika" />
      <CardContent>
        <div className="grid w-full items-center gap-4">
          <RadioGroup
            row
            value={connectionType}
            onChange={(e) =>
              setConnectionType(e.target.value as "system" | "raw")
            }
          >
            <FormControlLabel
              value="system"
              control={<Radio />}
              label="Iz seznama"
            />
            <FormControlLabel
              value="raw"
              control={<Radio />}
              label="Direktno po IP"
            />
          </RadioGroup>

          {connectionType === "system" ? (
            <div className="flex flex-col space-y-1.5">
              <Typography variant="body1">Tiskalnik</Typography>
              <TextField
                select
                value={
                  selectedPrinter?.type === "system"
                    ? selectedPrinter.name
                    : ""
                }
                onChange={(e) => selectSystemPrinter(e.target.value)}
                fullWidth
                slotProps={{ select: { native: true } }}
              >
                <option value="" disabled>
                  Izberite tiskalnik...
                </option>
                {localPrinters.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </TextField>
            </div>
          ) : (
            <div className="flex flex-col space-y-1.5">
              <Typography variant="body1">IP naslov tiskalnika</Typography>
              <TextField
                placeholder="192.168.1.50"
                value={networkHost}
                onChange={(e) => {
                  setNetworkHost(e.target.value);
                  selectRawPrinter(e.target.value);
                }}
                fullWidth
              />
            </div>
          )}

          <Button
            variant="outlined"
            className="w-full"
            startIcon={<TestTube />}
            onClick={handleTestPrint}
            disabled={isPending || !selectedPrinter}
          >
            {isPending ? "Pošiljanje tiskalnega posla..." : "Testni tisk"}
          </Button>
          <Button
            variant="contained"
            className="mt-2 w-full"
            startIcon={<Printer />}
            onClick={onClose}
          >
            Shrani nastavitve
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default PrinterSettings;