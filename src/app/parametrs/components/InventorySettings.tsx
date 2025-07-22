"use client";
import { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  FormControlLabel,
  Switch,
  Divider,
  Alert,
} from "@mui/material";

// Konfiguracija za avtomatsko odštevanje komponent
const getAutoDeductComponents = (): boolean => {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("autoDeductComponents");
    return stored !== null ? JSON.parse(stored) : true; // privzeto omogočeno
  }
  return true;
};

const setAutoDeductComponents = (enabled: boolean): void => {
  if (typeof window !== "undefined") {
    localStorage.setItem("autoDeductComponents", JSON.stringify(enabled));
  }
};

export function InventorySettings() {
  const [autoDeductComponents, setAutoDeductComponentsState] =
    useState<boolean>(true);
  const [showSaved, setShowSaved] = useState<boolean>(false);

  // Naložimo nastavitve ob mount-u komponente
  useEffect(() => {
    setAutoDeductComponentsState(getAutoDeductComponents());
  }, []);

  const handleAutoDeductChange = (enabled: boolean) => {
    setAutoDeductComponentsState(enabled);
    setAutoDeductComponents(enabled);

    // Prikaži potrditev
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 3000);
  };

  return (
    <Paper elevation={3} sx={{ p: 3, maxWidth: 600, mx: "auto" }}>
      <Typography variant="h5" gutterBottom>
        Inventory Settings
      </Typography>

      <Divider sx={{ my: 2 }} />

      <Box sx={{ mb: 3 }}>
        <FormControlLabel
          control={
            <Switch
              checked={autoDeductComponents}
              onChange={(e) => handleAutoDeductChange(e.target.checked)}
              color="primary"
            />
          }
          label={
            <Box>
              <Typography variant="body1" fontWeight="bold">
                Avtomatsko odštej komponente iz zaloge
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Ko je omogočeno, se komponente avtomatsko odštejejo iz zaloge
                vsakič ko pritisnete "Accept" gumb pri sestavljanju senzorjev.
              </Typography>
            </Box>
          }
        />
      </Box>

      {showSaved && (
        <Alert severity="success" sx={{ mt: 2 }}>
          Nastavitve so bile uspešno shranjene!
        </Alert>
      )}

      <Box sx={{ mt: 3, p: 2, backgroundColor: "info.light", borderRadius: 1 }}>
        <Typography variant="body2" color="info.contrastText">
          <strong>Opomba:</strong> Ta nastavitev velja za vso aplikacijo. Če je
          onemogočena, se komponente ne bodo avtomatsko odštele pri sestavljanju
          senzorjev in boste morali zaloge ročno upravljati preko inventory
          modula.
        </Typography>
      </Box>
    </Paper>
  );
}
