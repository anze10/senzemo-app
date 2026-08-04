"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  TextField,
  Typography,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import SaveIcon from "@mui/icons-material/Save";
import DescriptionIcon from "@mui/icons-material/Description";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import UpdateIcon from "@mui/icons-material/Update";
import type { ParsedSensorData } from "~/app/dev/components/Reader/ParseSensorData";
import {
  deleteConfig,
  getConfig,
  listConfigsForFamily,
  saveConfig,
} from "./Sensorconfigactions";

interface ConfigSelectorProps {
  familyId: number;
  productId: number;
  currentValues: ParsedSensorData;
  onApplyConfig: (values: ParsedSensorData) => void;
}

export function ConfigSelector({
  familyId,
  productId,
  currentValues,
  onApplyConfig,
}: ConfigSelectorProps) {
  const [configs, setConfigs] = useState<string[]>([]);
  const [selectedConfig, setSelectedConfig] = useState<string>("");
  const [searchValue, setSearchValue] = useState("");
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [newConfigName, setNewConfigName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function refreshConfigs() {
    setIsLoading(true);
    try {
      const list = await listConfigsForFamily(familyId, productId);
      setConfigs(list);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    setSelectedConfig("");
    setSearchValue("");
    void refreshConfigs();
  }, [familyId, productId]);

  const filteredConfigs = useMemo(() => {
    if (!searchValue.trim()) return configs;
    const q = searchValue.toLowerCase();
    return configs.filter((name) => name.toLowerCase().includes(q));
  }, [configs, searchValue]);

  async function handleSelectConfig(name: string) {
    setSelectedConfig(name);
    if (!name) {
      return;
    }
    const config = await getConfig(familyId, productId, name);
    if (config) {
      onApplyConfig(config.values);
    }
  }

  async function handleUseDefault() {
    setSelectedConfig("");
  }

  async function handleSave() {
    if (!newConfigName.trim()) return;
    await saveConfig(familyId, productId, newConfigName, currentValues);
    setSaveDialogOpen(false);
    setNewConfigName("");
    await refreshConfigs();
  }

  async function handleUpdate() {
    if (!selectedConfig) return;
    if (
      !window.confirm(
        `Posodobi konfiguracijo "${selectedConfig}" s trenutnimi vrednostmi?`,
      )
    )
      return;
    await saveConfig(familyId, productId, selectedConfig, currentValues);
    await refreshConfigs();
  }

  async function handleDelete(name: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!window.confirm(`Izbriši config "${name}"?`)) return;
    await deleteConfig(familyId, productId, name);
    if (selectedConfig === name) setSelectedConfig("");
    await refreshConfigs();
  }

  return (
    <Card variant="outlined">
      <CardContent>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
          }}
        >
          <Typography variant="subtitle1" fontWeight={600}>
            Konfiguracije (stranke)
          </Typography>
          <Chip
            size="small"
            label={`${configs.length} shranjenih`}
            variant="outlined"
          />
        </Box>

        <Autocomplete
          freeSolo
          options={filteredConfigs}
          inputValue={searchValue}
          onInputChange={(_e, value) => setSearchValue(value)}
          value={selectedConfig || null}
          onChange={(_e, value) => handleSelectConfig(value ?? "")}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Išči konfiguracijo..."
              placeholder="npr. ZDesigner_AcmeCorp"
              size="small"
            />
          )}
          sx={{ mb: 2 }}
        />

        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 1,
          }}
        >
          <Typography variant="caption" color="text.secondary">
            {isLoading
              ? "Nalagam..."
              : `Prikazanih ${filteredConfigs.length} od ${configs.length}`}
          </Typography>
          <Box sx={{ display: "flex", gap: 1 }}>
            {selectedConfig && (
              <Button
                size="small"
                color="secondary"
                startIcon={<UpdateIcon />}
                onClick={handleUpdate}
              >
                Posodobi &quot;{selectedConfig}&quot;
              </Button>
            )}
            <Button
              size="small"
              startIcon={<SaveIcon />}
              onClick={() => setSaveDialogOpen(true)}
            >
              Shrani kot novo
            </Button>
          </Box>
        </Box>

        <Divider sx={{ mb: 1 }} />

        <List
          dense
          sx={{
            maxHeight: 280,
            overflowY: "auto",
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 1,
          }}
        >
          <ListItemButton
            selected={selectedConfig === ""}
            onClick={handleUseDefault}
          >
            <ListItemIcon>
              <CheckCircleIcon
                fontSize="small"
                color={selectedConfig === "" ? "primary" : "disabled"}
              />
            </ListItemIcon>
            <ListItemText
              primary="Privzeto (iz baze)"
              slotProps={{ primary: { fontStyle: "italic" } }}
            />
          </ListItemButton>

          {filteredConfigs.length === 0 && !isLoading && (
            <Box sx={{ p: 2, textAlign: "center" }}>
              <Typography variant="body2" color="text.secondary">
                {configs.length === 0
                  ? "Ni shranjenih konfiguracij za ta senzor."
                  : "Ni ujemajočih rezultatov."}
              </Typography>
            </Box>
          )}

          {filteredConfigs.map((name) => (
            <ListItemButton
              key={name}
              selected={selectedConfig === name}
              onClick={() => handleSelectConfig(name)}
            >
              <ListItemIcon>
                <DescriptionIcon
                  fontSize="small"
                  color={selectedConfig === name ? "primary" : "action"}
                />
              </ListItemIcon>
              <ListItemText primary={name} />
              <IconButton
                size="small"
                edge="end"
                color="error"
                onClick={(e) => handleDelete(name, e)}
                title="Izbriši"
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </ListItemButton>
          ))}
        </List>
      </CardContent>

      <Dialog open={saveDialogOpen} onClose={() => setSaveDialogOpen(false)}>
        <DialogTitle>Shrani konfiguracijo</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Ime lahko vključuje tip senzorja in stranko, npr. &quot;ZDesigner_AcmeCorp&quot;
          </Typography>
          <TextField
            autoFocus
            fullWidth
            label="Ime konfiguracije"
            value={newConfigName}
            onChange={(e) => setNewConfigName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveDialogOpen(false)}>Prekliči</Button>
          <Button variant="contained" onClick={handleSave}>
            Shrani
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}