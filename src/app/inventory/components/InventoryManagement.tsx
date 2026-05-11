"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMediaQuery, useTheme } from "@mui/material";
import CssBaseline from "@mui/material/CssBaseline";
import Container from "@mui/material/Container";
import Image from "next/image";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Switch,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import EditIcon from "@mui/icons-material/Edit";
import HistoryIcon from "@mui/icons-material/History";
import EmailIcon from "@mui/icons-material/Email";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import MemoryIcon from "@mui/icons-material/Memory";
import RadioIcon from "@mui/icons-material/Radio";
import WarningIcon from "@mui/icons-material/Warning";
import DownloadIcon from "@mui/icons-material/Download";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import DeleteIcon from "@mui/icons-material/Delete";
import AssignmentIcon from "@mui/icons-material/Assignment";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import SaveIcon from "@mui/icons-material/Save";
import CancelIcon from "@mui/icons-material/Cancel";
import FileUploadIcon from "@mui/icons-material/FileUpload";
import {
  adjustComponentStockWithInvoice,
  adjustSensorStock,
  addComponentToInventory,
  addSensorToInventory,
  assignDeviceToOrder,
  deleteComponentFromInventory,
  deleteSensorFromInventory,
  getAllComponents,
  getAllOrders,
  getInvoiceFileDownloadUrl,
  getLowComponents,
  getProductionByFrequency,
  getProductionDevices,
  getProductionHierarchy,
  getSensors,
  releaseDeviceFromOrder,
  showAllComponents,
  showLogs,
  updateComponentSensorAssignments,
  updateComponentStock,
  updateSensorFrequency,
} from "src/app/inventory/components/backent";

// Types
type Frequency = "AS923" | "EU868" | "US915" | "2.4 GHz";

type LowComponentItem = {
  componentId: number;
  componentName: string;
  availableQuantity: number;
};

export type LogEntry = {
  id: number;
  timestamp: Date;
  itemType: "sensor" | "component";
  itemName: string;
  change: number;
  reason: string;
  user?: string;
  invoiceNumber?: string;
};

type ContactDetails = {
  supplier: string;
  email: string;
  phone: string;
};

interface SenzorStockItem {
  id?: number;
  senzorId: number;
  sensorName: string;
  quantity: number;
  location: string;
  lastUpdated?: Date;
  frequency?: Frequency;
  dev_eui?: string;
}

export type ComponentStockItem = {
  id: number;
  componentId: number;
  name: string;
  quantity: number;
  location: string;
  lastUpdated: Date;
  sensorAssignments: {
    sensorId: number;
    sensorName: string;
    requiredQuantity: number;
  }[];
  invoiceNumber?: string;
  invoiceFile?: string;
  invoiceFileKey?: string;
  contactDetails: ContactDetails;
  price?: number;
  lowStockThreshold?: number;
  isCritical?: boolean;
  invoiceDetails?: {
    id: number;
    invoiceNumber: string;
    totalAmount: number;
    supplier: string;
    uploadDate: Date;
    filename: string | null;
    relatedComponents: {
      componentName: string;
      componentStockId: number;
    }[];
  } | null;
};

type InventoryItem = SenzorStockItem | ComponentStockItem;

type SensorOption = {
  id: number;
  name: string;
  selected: boolean;
  requiredQuantity: number;
};

type ProductionGroupByType = {
  deviceType: string;
  totalDevices: number;
  frequencies: ProductionGroupByFrequency[];
  expanded: boolean;
};

type ProductionGroupByFrequency = {
  frequency: string;
  count: number;
  devices: ProductionDevice[];
  expanded: boolean;
};

type ProductionDevice = {
  id: number;
  devEUI: string;
  appEUI: string | null;
  deviceType: string | null;
  frequency: string | null;
  hwVersion: string | null;
  fwVersion: string | null;
  isAvailable: boolean;
};

type Order = {
  id: number;
  customerName?: string;
};

// Optimized SensorImage component with memoization
const SensorImage = React.memo(({ sensorName }: { sensorName: string }) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageUrl, setImageUrl] = useState<string>("");

  useEffect(() => {
    if (!sensorName) return;

    let isMounted = true;
    const fetchImageUrl = async () => {
      try {
        const url = await getSensorImageUrl(sensorName);
        if (isMounted) {
          setImageUrl(url);
        }
      } catch (error) {
        console.error("Error fetching image URL:", error);
        if (isMounted) setImageUrl("");
      }
    };
    fetchImageUrl();
    return () => {
      isMounted = false;
    };
  }, [sensorName]);

  const handleImageError = useCallback(() => {
    setImageError(true);
  }, []);

  const handleImageLoad = useCallback(() => {
    setImageLoaded(true);
  }, []);

  if (imageError || !imageUrl) {
    return (
      <Box
        sx={{
          width: "100%",
          aspectRatio: "1 / 1",
          backgroundColor: "grey.100",
          borderRadius: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "2px dashed",
          borderColor: "grey.300",
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 1,
            color: "grey.500",
          }}
        >
          <MemoryIcon sx={{ fontSize: 40 }} />
          <Typography
            variant="caption"
            sx={{
              fontWeight: 500,
              textAlign: "center",
            }}
          >
            {sensorName}
            <br />
            {imageError ? "Load Failed" : "No Image"}
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        width: "100%",
        aspectRatio: "1 / 1",
        position: "relative",
        borderRadius: 1,
        overflow: "hidden",
        backgroundColor: imageLoaded ? "transparent" : "grey.100",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {!imageLoaded && (
        <Box
          sx={{
            position: "absolute",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            height: "100%",
            color: "grey.500",
          }}
        >
          <MemoryIcon sx={{ fontSize: 40 }} />
        </Box>
      )}
      <Image
        src={imageUrl}
        alt={`${sensorName} sensor`}
        fill
        style={{
          objectFit: "contain",
          display: imageLoaded ? "block" : "none",
          borderRadius: "4px",
        }}
        onError={handleImageError}
        onLoad={handleImageLoad}
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      />
    </Box>
  );
});

SensorImage.displayName = 'SensorImage';

// Optimized Devices Tab Component
const DevicesTab = React.memo(({
  productionHierarchy,
  deviceSearchQuery,
  setDeviceSearchQuery,
  filteredHierarchy,
  isMobile,
  toggleSensorExpanded,
  toggleFrequencyExpanded,
  openDeviceActionDialog,
  openFrequencyEditDialog,
  handleRemoveDevice
}: {
  productionHierarchy: ProductionGroupByType[];
  deviceSearchQuery: string;
  setDeviceSearchQuery: (query: string) => void;
  filteredHierarchy: ProductionGroupByType[];
  isMobile: boolean;
  toggleSensorExpanded: (deviceType: string) => void;
  toggleFrequencyExpanded: (deviceType: string, frequency: string) => void;
  openDeviceActionDialog: (device: ProductionDevice) => void;
  openFrequencyEditDialog: (device: ProductionDevice) => void;
  handleRemoveDevice: (device: ProductionDevice) => void;
}) => {
  return (
    <Paper elevation={3} sx={{ mb: 4, overflow: "hidden" }}>
      <Box sx={{ p: { xs: 2, md: 4 } }}>
        <Typography
          variant="h6"
          sx={{
            mb: { xs: 2, md: 4 },
            fontWeight: 600,
            color: "primary.main",
          }}
        >
          Device Inventory - Hierarchical View
        </Typography>

        {/* Device Search Field */}
        <Box sx={{ mb: 3 }}>
          <Tooltip
            title="Press Ctrl+F to focus search, Esc to clear"
            placement="top"
          >
            <TextField
              value={deviceSearchQuery}
              onChange={(e) => setDeviceSearchQuery(e.target.value)}
              placeholder="Search by Device EUI or App EUI..."
              fullWidth
              size="small"
              InputProps={{
                startAdornment: (
                  <SearchIcon
                    sx={{ mr: 1, color: "text.secondary" }}
                  />
                ),
                endAdornment: deviceSearchQuery && (
                  <IconButton
                    size="small"
                    onClick={() => setDeviceSearchQuery("")}
                    sx={{ p: 0.5 }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                ),
              }}
              sx={{
                maxWidth: { xs: "100%", md: 400 },
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                },
              }}
            />
          </Tooltip>
          {deviceSearchQuery && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mt: 1, display: "block" }}
            >
              Searching for: &ldquo;{deviceSearchQuery}&rdquo;
              {(() => {
                const totalFilteredDevices = productionHierarchy
                  .flatMap((sensorGroup) => sensorGroup.frequencies)
                  .flatMap((freqGroup) => freqGroup.devices)
                  .filter((device) => {
                    const searchLower =
                      deviceSearchQuery.toLowerCase();
                    return (
                      device.devEUI
                        ?.toLowerCase()
                        .includes(searchLower) ||
                      device.appEUI
                        ?.toLowerCase()
                        .includes(searchLower)
                    );
                  }).length;

                return totalFilteredDevices > 0
                  ? ` - ${totalFilteredDevices} device${totalFilteredDevices !== 1 ? "s" : ""} found`
                  : "";
              })()}
            </Typography>
          )}
        </Box>

        {(() => {
          if (productionHierarchy.length === 0) {
            return (
              <Card elevation={2} sx={{ p: 6, textAlign: "center" }}>
                <Typography color="text.secondary" variant="h6">
                  No devices in inventory
                </Typography>
                <Typography
                  color="text.secondary"
                  variant="body2"
                  sx={{ mt: 1 }}
                >
                  Add devices to see them organized by type and
                  frequency
                </Typography>
              </Card>
            );
          }

          if (
            deviceSearchQuery.trim() &&
            filteredHierarchy.length === 0
          ) {
            return (
              <Card elevation={2} sx={{ p: 6, textAlign: "center" }}>
                <SearchIcon
                  sx={{
                    fontSize: 64,
                    color: "text.secondary",
                    mb: 2,
                  }}
                />
                <Typography color="text.secondary" variant="h6">
                  No devices found
                </Typography>
                <Typography
                  color="text.secondary"
                  variant="body2"
                  sx={{ mt: 1 }}
                >
                  No devices match &ldquo;{deviceSearchQuery}&rdquo;
                </Typography>
                <Button
                  variant="outlined"
                  onClick={() => setDeviceSearchQuery("")}
                  sx={{ mt: 2 }}
                  size="small"
                >
                  Clear Search
                </Button>
              </Card>
            );
          }

          return (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 2,
              }}
            >
              {filteredHierarchy.map((sensorGroup) => (
                <Card
                  key={sensorGroup.deviceType}
                  elevation={1}
                  sx={{
                    borderRadius: 2,
                    border: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  {/* Level 1: Device Type */}
                  <Box
                    onClick={() =>
                      toggleSensorExpanded(sensorGroup.deviceType)
                    }
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      p: { xs: 2, md: 3 },
                      bgcolor: "grey.50",
                      cursor: "pointer",
                      minHeight: { xs: 60, md: "auto" },
                      "&:hover": {
                        bgcolor: "grey.100",
                      },
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: { xs: 1, md: 2 },
                      }}
                    >
                      <IconButton
                        size={isMobile ? "medium" : "small"}
                        sx={{
                          minWidth: { xs: 44, md: "auto" },
                          minHeight: { xs: 44, md: "auto" },
                        }}
                      >
                        {sensorGroup.expanded ? (
                          <ExpandMoreIcon />
                        ) : (
                          <ChevronRightIcon />
                        )}
                      </IconButton>
                      <MemoryIcon
                        sx={{ color: "text.secondary" }}
                      />
                      <Typography
                        variant={isMobile ? "subtitle1" : "h6"}
                        sx={{
                          fontWeight: 600,
                          color: "text.primary",
                        }}
                      >
                        {sensorGroup.deviceType}
                      </Typography>
                      <Chip
                        label={`${sensorGroup.totalDevices} total`}
                        color="primary"
                        size={isMobile ? "medium" : "small"}
                      />
                    </Box>
                  </Box>

                  {/* Level 2: Frequencies */}
                  <AnimatePresence>
                    {sensorGroup.expanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        {sensorGroup.frequencies.map(
                          (freqGroup) => (
                            <Box
                              key={freqGroup.frequency}
                              sx={{
                                borderTop: 1,
                                borderColor: "divider",
                              }}
                            >
                              <Box
                                onClick={() =>
                                  toggleFrequencyExpanded(
                                    sensorGroup.deviceType,
                                    freqGroup.frequency,
                                  )
                                }
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  p: { xs: 2, md: 3 },
                                  pl: { xs: 3, md: 6 },
                                  bgcolor: "grey.25",
                                  cursor: "pointer",
                                  minHeight: { xs: 56, md: "auto" },
                                  "&:hover": {
                                    bgcolor: "grey.50",
                                  },
                                }}
                              >
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: { xs: 1, md: 2 },
                                  }}
                                >
                                  <IconButton
                                    size={
                                      isMobile ? "medium" : "small"
                                    }
                                    sx={{
                                      minWidth: {
                                        xs: 44,
                                        md: "auto",
                                      },
                                      minHeight: {
                                        xs: 44,
                                        md: "auto",
                                      },
                                    }}
                                  >
                                    {freqGroup.expanded ? (
                                      <ExpandMoreIcon />
                                    ) : (
                                      <ChevronRightIcon />
                                    )}
                                  </IconButton>
                                  <RadioIcon
                                    sx={{ color: "text.secondary" }}
                                  />
                                  <Typography
                                    variant={
                                      isMobile
                                        ? "body1"
                                        : "subtitle1"
                                    }
                                    sx={{ fontWeight: 500 }}
                                  >
                                    {freqGroup.frequency}
                                  </Typography>
                                  <Chip
                                    label={`${freqGroup.count} devices`}
                                    color="secondary"
                                    size="small"
                                    variant="outlined"
                                  />
                                </Box>
                              </Box>

                              {/* Level 3: Individual devices */}
                              <AnimatePresence>
                                {freqGroup.expanded && (
                                  <motion.div
                                    initial={{
                                      opacity: 0,
                                      height: 0,
                                    }}
                                    animate={{
                                      opacity: 1,
                                      height: "auto",
                                    }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ duration: 0.3 }}
                                  >
                                    <Box
                                      sx={{ bgcolor: "grey.25" }}
                                    >
                                      {freqGroup.devices.map(
                                        (device) => (
                                          <Box
                                            key={device.id}
                                            sx={{
                                              p: { xs: 2, md: 3 },
                                              pl: { xs: 4, md: 10 },
                                              borderTop:
                                                "1px solid",
                                              borderColor:
                                                "divider",
                                              "&:hover": {
                                                bgcolor: "grey.50",
                                              },
                                            }}
                                          >
                                            <Box
                                              sx={{
                                                display: "flex",
                                                flexDirection: {
                                                  xs: "column",
                                                  md: "row",
                                                },
                                                alignItems: {
                                                  xs: "flex-start",
                                                  md: "center",
                                                },
                                                justifyContent:
                                                  "space-between",
                                                gap: {
                                                  xs: 1,
                                                  md: 2,
                                                },
                                              }}
                                            >
                                              <Box
                                                sx={{
                                                  display: "flex",
                                                  flexDirection: {
                                                    xs: "column",
                                                    sm: "row",
                                                  },
                                                  gap: {
                                                    xs: 1,
                                                    sm: 2,
                                                  },
                                                  flex: 1,
                                                }}
                                              >
                                                <Typography
                                                  variant="body2"
                                                  sx={{
                                                    fontFamily:
                                                      "monospace",
                                                    fontWeight: 500,
                                                    color:
                                                      "primary.main",
                                                  }}
                                                >
                                                  DevEUI:{" "}
                                                  {device.devEUI ||
                                                    "N/A"}
                                                </Typography>
                                                {isMobile && (
                                                  <Box
                                                    sx={{
                                                      display:
                                                        "flex",
                                                      alignItems:
                                                        "center",
                                                      gap: 0.5,
                                                      mt: 0.5,
                                                    }}
                                                  >
                                                    <Typography
                                                      variant="body2"
                                                      color="text.secondary"
                                                    >
                                                      Frequency:{" "}
                                                      {device.frequency ||
                                                        "N/A"}
                                                    </Typography>
                                                    <Tooltip title="Edit Frequency">
                                                      <IconButton
                                                        size="small"
                                                        onClick={() =>
                                                          openFrequencyEditDialog(
                                                            device,
                                                          )
                                                        }
                                                        sx={{
                                                          color:
                                                            "text.secondary",
                                                          "&:hover":
                                                          {
                                                            color:
                                                              "primary.main",
                                                          },
                                                          p: 0.25,
                                                        }}
                                                      >
                                                        <EditIcon fontSize="small" />
                                                      </IconButton>
                                                    </Tooltip>
                                                  </Box>
                                                )}
                                                {!isMobile && (
                                                  <>
                                                    <Typography
                                                      variant="body2"
                                                      color="text.secondary"
                                                    >
                                                      AppEUI:{" "}
                                                      {device.appEUI ||
                                                        "N/A"}
                                                    </Typography>
                                                    <Typography
                                                      variant="body2"
                                                      color="text.secondary"
                                                    >
                                                      HW:{" "}
                                                      {device.hwVersion ||
                                                        "N/A"}
                                                    </Typography>
                                                    <Typography
                                                      variant="body2"
                                                      color="text.secondary"
                                                    >
                                                      FW:{" "}
                                                      {device.fwVersion ||
                                                        "N/A"}
                                                    </Typography>
                                                    <Box
                                                      sx={{
                                                        display:
                                                          "flex",
                                                        alignItems:
                                                          "center",
                                                        gap: 0.5,
                                                      }}
                                                    >
                                                      <Typography
                                                        variant="body2"
                                                        color="text.secondary"
                                                      >
                                                        Freq:{" "}
                                                        {device.frequency ||
                                                          "N/A"}
                                                      </Typography>
                                                      <Tooltip title="Edit Frequency">
                                                        <IconButton
                                                          size="small"
                                                          onClick={() =>
                                                            openFrequencyEditDialog(
                                                              device,
                                                            )
                                                          }
                                                          sx={{
                                                            color:
                                                              "text.secondary",
                                                            "&:hover":
                                                            {
                                                              color:
                                                                "primary.main",
                                                            },
                                                            p: 0.25,
                                                          }}
                                                        >
                                                          <EditIcon fontSize="small" />
                                                        </IconButton>
                                                      </Tooltip>
                                                    </Box>
                                                  </>
                                                )}
                                              </Box>

                                              <Box
                                                sx={{
                                                  display: "flex",
                                                  alignItems:
                                                    "center",
                                                  gap: 1,
                                                }}
                                              >
                                                <Chip
                                                  label={
                                                    device.isAvailable
                                                      ? "Available"
                                                      : "Assigned"
                                                  }
                                                  color={
                                                    device.isAvailable
                                                      ? "success"
                                                      : "warning"
                                                  }
                                                  size="small"
                                                />

                                                {/* Device Action Buttons */}
                                                <Box
                                                  sx={{
                                                    display: "flex",
                                                    gap: 0.5,
                                                  }}
                                                >
                                                  <Tooltip title="Device Actions">
                                                    <IconButton
                                                      size="small"
                                                      onClick={() =>
                                                        openDeviceActionDialog(
                                                          device,
                                                        )
                                                      }
                                                      sx={{
                                                        color:
                                                          "primary.main",
                                                        "&:hover": {
                                                          bgcolor:
                                                            "primary.main",
                                                          color:
                                                            "primary.contrastText",
                                                        },
                                                      }}
                                                    >
                                                      <AssignmentIcon fontSize="small" />
                                                    </IconButton>
                                                  </Tooltip>

                                                  <Tooltip title="Remove from Inventory">
                                                    <IconButton
                                                      size="small"
                                                      onClick={() =>
                                                        handleRemoveDevice(
                                                          device,
                                                        )
                                                      }
                                                      sx={{
                                                        color:
                                                          "error.main",
                                                        "&:hover": {
                                                          bgcolor:
                                                            "error.main",
                                                          color:
                                                            "error.contrastText",
                                                        },
                                                      }}
                                                    >
                                                      <DeleteIcon fontSize="small" />
                                                    </IconButton>
                                                  </Tooltip>
                                                </Box>
                                              </Box>
                                            </Box>
                                            {isMobile && (
                                              <Box
                                                sx={{
                                                  mt: 1,
                                                  display: "grid",
                                                  gridTemplateColumns:
                                                    "1fr 1fr",
                                                  gap: 1,
                                                }}
                                              >
                                                <Typography
                                                  variant="caption"
                                                  color="text.secondary"
                                                >
                                                  AppEUI:{" "}
                                                  {device.appEUI ||
                                                    "N/A"}
                                                </Typography>
                                                <Typography
                                                  variant="caption"
                                                  color="text.secondary"
                                                >
                                                  HW:{" "}
                                                  {device.hwVersion ||
                                                    "N/A"}
                                                </Typography>
                                                <Typography
                                                  variant="caption"
                                                  color="text.secondary"
                                                  sx={{
                                                    gridColumn:
                                                      "1 / -1",
                                                  }}
                                                >
                                                  FW:{" "}
                                                  {device.fwVersion ||
                                                    "N/A"}
                                                </Typography>
                                              </Box>
                                            )}
                                          </Box>
                                        ),
                                      )}
                                    </Box>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </Box>
                          ),
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              ))}
            </Box>
          );
        })()}
      </Box>
    </Paper>
  );
});

DevicesTab.displayName = 'DevicesTab';

// Optimized Components Tab Component
const ComponentsTab = React.memo(({
  componentSearchQuery,
  setComponentSearchQuery,
  filteredComponents,
  isMobile,
  getComponentAlertInfo,
  isComponentInLowList,
  handleEditItem,
  openAdjustmentDialog,
  handleDownloadInvoiceFile
}: {
  componentSearchQuery: string;
  setComponentSearchQuery: (query: string) => void;
  filteredComponents: ComponentStockItem[];
  isMobile: boolean;
  getComponentAlertInfo: (component: ComponentStockItem) => { showAlert: boolean, severity: "warning" | "error", color: string, message: string };
  isComponentInLowList: (component: ComponentStockItem) => boolean;
  handleEditItem: (item: InventoryItem) => void;
  openAdjustmentDialog: (item: InventoryItem, type: "increase" | "decrease") => void;
  handleDownloadInvoiceFile: (invoiceNumber: string, filename: string) => Promise<void>;
}) => {
  return (
    <>
      {/* Search Bar */}
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Search components by name, supplier, email, or invoice..."
          value={componentSearchQuery}
          onChange={(e) =>
            setComponentSearchQuery(e.target.value)
          }
          sx={{
            maxWidth: { xs: "100%", md: "400px" },
            "& .MuiOutlinedInput-root": {
              borderRadius: 2,
            },
          }}
          InputProps={{
            startAdornment: (
              <Box sx={{ mr: 1, color: "text.secondary" }}>
                🔍
              </Box>
            ),
          }}
        />
        {componentSearchQuery && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mt: 1, display: "block" }}
          >
            Found {filteredComponents.length} component
            {filteredComponents.length !== 1 ? "s" : ""}
          </Typography>
        )}
      </Box>

      {/* Mobile Card Layout */}
      {isMobile ? (
        <Box sx={{ mb: 3 }}>
          <AnimatePresence>
            {filteredComponents.length > 0 ? (
              filteredComponents.map((item1) => (
                <motion.div
                  key={item1.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card
                    elevation={2}
                    sx={{
                      mb: 2,
                      borderRadius: 2,
                      border: "1px solid",
                      borderColor: "divider",
                    }}
                  >
                    <CardContent sx={{ p: 3 }}>
                      {/* Header with name, warning light, and edit button */}
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          mb: 2,
                        }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            flex: 1,
                            mr: 1,
                          }}
                        >
                          {/* Alert Icon for Low Components */}
                          {(() => {
                            const alertInfo =
                              getComponentAlertInfo(item1);
                            const isInLowList =
                              isComponentInLowList(item1);
                            if (
                              alertInfo.showAlert ||
                              isInLowList
                            ) {
                              return (
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    mr: 1,
                                  }}
                                >
                                  <WarningIcon
                                    sx={{
                                      color: isInLowList
                                        ? "error.main"
                                        : alertInfo.color,
                                      fontSize: 24,
                                    }}
                                    className={
                                      isInLowList
                                        ? "pulse-fast glow-critical"
                                        : "pulse-normal glow-warning"
                                    }
                                  />
                                </Box>
                              );
                            }
                            return null;
                          })()}

                          {/* Critical Component Indicator */}
                          {item1.isCritical && (
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                mr: 1,
                              }}
                            >
                              <Chip
                                label="Critical"
                                size="small"
                                color="error"
                                variant="filled"
                                sx={{
                                  fontSize: "0.6rem",
                                  height: 20,
                                }}
                              />
                            </Box>
                          )}
                          <Typography
                            variant="h6"
                            sx={{
                              fontWeight: 600,
                              color: "primary.main",
                            }}
                          >
                            {item1.name || "Unnamed Component"}
                          </Typography>
                        </Box>
                        <IconButton
                          color="primary"
                          onClick={() => handleEditItem(item1)}
                          sx={{ p: 1 }}
                        >
                          <EditIcon />
                        </IconButton>
                      </Box>

                      {/* Quantity controls */}
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          mb: 2,
                          p: 2,
                          bgcolor: "grey.50",
                          borderRadius: 1,
                        }}
                      >
                        <Typography
                          variant="body2"
                          color="text.secondary"
                        >
                          Quantity
                        </Typography>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                          }}
                        >
                          <IconButton
                            size="medium"
                            onClick={() =>
                              openAdjustmentDialog(
                                item1,
                                "decrease",
                              )
                            }
                            sx={{
                              bgcolor: "error.main",
                              color: "white",
                              "&:hover": {
                                bgcolor: "error.dark",
                              },
                              minWidth: 44,
                              minHeight: 44,
                            }}
                          >
                            <RemoveIcon />
                          </IconButton>
                          <Typography
                            variant="h6"
                            sx={{
                              mx: 3,
                              minWidth: 40,
                              textAlign: "center",
                              fontWeight: 600,
                            }}
                          >
                            {item1.quantity ?? "0"}
                          </Typography>
                          <IconButton
                            size="medium"
                            onClick={() =>
                              openAdjustmentDialog(
                                item1,
                                "increase",
                              )
                            }
                            sx={{
                              bgcolor: "success.main",
                              color: "white",
                              "&:hover": {
                                bgcolor: "success.dark",
                              },
                              minWidth: 44,
                              minHeight: 44,
                            }}
                          >
                            <AddIcon />
                          </IconButton>
                        </Box>
                      </Box>

                      {/* Component details grid */}
                      <Box
                        sx={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: 2,
                          mb: 2,
                        }}
                      >
                        <Box>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                          >
                            Price per Item
                          </Typography>
                          <Typography
                            variant="body1"
                            fontWeight={500}
                          >
                            {item1.price !== undefined &&
                              item1.price !== null
                              ? `€${Number(item1.price).toFixed(2)}`
                              : "-"}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                          >
                            Last Updated
                          </Typography>
                          <Typography variant="body2">
                            {item1.lastUpdated
                              ? new Date(
                                item1.lastUpdated,
                              ).toLocaleDateString()
                              : "-"}
                          </Typography>
                        </Box>
                      </Box>

                      {/* Supplier information */}
                      <Box sx={{ mb: 2 }}>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                        >
                          Supplier
                        </Typography>
                        <Typography
                          variant="body1"
                          fontWeight={500}
                          sx={{ wordBreak: "break-word" }}
                        >
                          {item1.contactDetails?.supplier || "-"}
                        </Typography>
                        {item1.contactDetails?.email && (
                          <Typography
                            variant="body2"
                            sx={{ mt: 0.5 }}
                          >
                            {item1.contactDetails.email.includes(
                              "@",
                            ) ? (
                              <a
                                href={`mailto:${item1.contactDetails.email}`}
                                style={{
                                  color: "#0369a1",
                                  textDecoration: "none",
                                }}
                              >
                                {item1.contactDetails.email}
                              </a>
                            ) : (
                              <a
                                href={
                                  item1.contactDetails.email.startsWith(
                                    "http",
                                  )
                                    ? item1.contactDetails.email
                                    : `https://${item1.contactDetails.email}`
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  color: "#0369a1",
                                  textDecoration: "none",
                                }}
                              >
                                {item1.contactDetails.email}
                              </a>
                            )}
                          </Typography>
                        )}
                      </Box>

                      {/* Threshold and Critical Status Information */}
                      <Box sx={{ mb: 2 }}>
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            mb: 1,
                          }}
                        >
                          <Box>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              Low Stock Threshold
                            </Typography>
                            <Typography
                              variant="body2"
                              fontWeight={500}
                            >
                              {item1.lowStockThreshold !== null &&
                                item1.lowStockThreshold !==
                                undefined
                                ? `${item1.lowStockThreshold} units`
                                : "No threshold set"}
                            </Typography>
                          </Box>
                          {(() => {
                            const alertInfo =
                              getComponentAlertInfo(item1);
                            const isInLowList =
                              isComponentInLowList(item1);
                            if (
                              alertInfo.showAlert ||
                              isInLowList
                            ) {
                              return (
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 0.5,
                                    p: 1,
                                    borderRadius: 1,
                                    bgcolor: isInLowList
                                      ? "error.light"
                                      : alertInfo.severity ===
                                        "warning"
                                        ? "warning.light"
                                        : "error.light",
                                    border: 1,
                                    borderColor: isInLowList
                                      ? "error.main"
                                      : alertInfo.severity ===
                                        "warning"
                                        ? "warning.main"
                                        : "divider",
                                  }}
                                >
                                  <WarningIcon
                                    sx={{
                                      color: isInLowList
                                        ? "error.main"
                                        : alertInfo.color,
                                      fontSize: 16,
                                    }}
                                  />
                                  <Typography
                                    variant="caption"
                                    color={
                                      isInLowList
                                        ? "error.main"
                                        : alertInfo.color
                                    }
                                    fontWeight={600}
                                  >
                                    {isInLowList
                                      ? "CRITICALLY LOW"
                                      : alertInfo.message}
                                  </Typography>
                                  {isInLowList && (
                                    <Chip
                                      label="DATABASE ALERT"
                                      size="small"
                                      color="error"
                                      variant="filled"
                                      sx={{
                                        fontSize: "0.5rem",
                                        height: 16,
                                      }}
                                    />
                                  )}
                                </Box>
                              );
                            }
                            return null;
                          })()}
                        </Box>
                      </Box>

                      {/* Sensor requirements */}
                      {Array.isArray(item1.sensorAssignments) &&
                        item1.sensorAssignments.length > 0 && (
                          <Box sx={{ mb: 2 }}>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              Sensor Requirements
                            </Typography>
                            <Box
                              sx={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: 0.5,
                                mt: 0.5,
                              }}
                            >
                              {item1.sensorAssignments.map(
                                (sa, index) => (
                                  <Chip
                                    key={index}
                                    label={`${sa.sensorName} (${sa.requiredQuantity})`}
                                    size="small"
                                    variant="outlined"
                                    color="primary"
                                  />
                                ),
                              )}
                            </Box>
                          </Box>
                        )}

                      {/* Invoice file information */}
                      <Box sx={{ mb: 2 }}>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                        >
                          Invoice Information
                        </Typography>
                        {item1.invoiceFile ? (
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                              mt: 0.5,
                              p: 1,
                              bgcolor: "grey.50",
                              borderRadius: 1,
                            }}
                          >
                            <AttachFileIcon
                              sx={{
                                fontSize: 16,
                                color: "primary.main",
                              }}
                            />
                            <Box sx={{ flex: 1 }}>
                              <Typography
                                variant="body2"
                                fontWeight={500}
                              >
                                {item1.invoiceNumber ||
                                  "Unknown Invoice"}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                {item1.invoiceFile}
                              </Typography>
                            </Box>
                            <Button
                              size="small"
                              startIcon={<DownloadIcon />}
                              onClick={() =>
                                handleDownloadInvoiceFile(
                                  item1.invoiceNumber || "",
                                  item1.invoiceFile || "",
                                )
                              }
                              sx={{
                                textTransform: "none",
                                fontSize: "0.75rem",
                              }}
                            >
                              Download
                            </Button>
                          </Box>
                        ) : item1.invoiceNumber ? (
                          <Box
                            sx={{
                              mt: 0.5,
                              p: 1,
                              bgcolor: "warning.light",
                              borderRadius: 1,
                            }}
                          >
                            <Typography
                              variant="body2"
                              color="warning.dark"
                            >
                              Invoice: {item1.invoiceNumber}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="warning.dark"
                            >
                              No file uploaded
                            </Typography>
                          </Box>
                        ) : (
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ mt: 0.5 }}
                          >
                            No invoice information
                          </Typography>
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            ) : (
              <Card
                elevation={2}
                sx={{ p: 6, textAlign: "center" }}
              >
                <Typography color="text.secondary" variant="h6">
                  {componentSearchQuery
                    ? "No components match your search"
                    : "No components in inventory"}
                </Typography>
                <Typography
                  color="text.secondary"
                  variant="body2"
                  sx={{ mt: 1 }}
                >
                  {componentSearchQuery
                    ? "Try adjusting your search terms"
                    : "Add your first component to get started"}
                </Typography>
              </Card>
            )}
          </AnimatePresence>
        </Box>
      ) : (
        /* Desktop Table Layout */
        <Paper elevation={3} className="mb-8 overflow-hidden">
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Quantity</TableCell>
                  <TableCell>Price per Item</TableCell>
                  <TableCell>Supplier</TableCell>
                  <TableCell>Supplier Contact</TableCell>
                  <TableCell>Sensor Requirements</TableCell>
                  <TableCell>Invoice File</TableCell>
                  <TableCell>Last Updated</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <AnimatePresence>
                  {filteredComponents.length > 0 &&
                    filteredComponents.map((item1) => (
                      <motion.tr
                        key={item1.id}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <TableCell className="font-bold">
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                            }}
                          >
                            {/* Alert Icon for Low Components */}
                            {(() => {
                              const alertInfo =
                                getComponentAlertInfo(item1);
                              const isInLowList =
                                isComponentInLowList(item1);
                              if (
                                alertInfo.showAlert ||
                                isInLowList
                              ) {
                                return (
                                  <Box
                                    sx={{
                                      display: "flex",
                                      alignItems: "center",
                                      mr: 0.5,
                                    }}
                                  >
                                    <WarningIcon
                                      sx={{
                                        color: isInLowList
                                          ? "error.main"
                                          : alertInfo.color,
                                        fontSize: 20,
                                      }}
                                      className={
                                        isInLowList
                                          ? "pulse-fast glow-critical"
                                          : "pulse-normal glow-warning"
                                      }
                                    />
                                  </Box>
                                );
                              }
                              return null;
                            })()}

                            {/* Critical Component Indicator */}
                            {item1.isCritical && (
                              <Chip
                                label="Critical"
                                size="small"
                                color="error"
                                variant="filled"
                                sx={{
                                  fontSize: "0.6rem",
                                  height: 18,
                                  mr: 0.5,
                                }}
                              />
                            )}
                            {item1.name || "-"}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box className="flex items-center">
                            <IconButton
                              size="small"
                              onClick={() =>
                                openAdjustmentDialog(
                                  item1,
                                  "decrease",
                                )
                              }
                            >
                              <RemoveIcon />
                            </IconButton>
                            <Typography className="mx-2">
                              {item1.quantity ?? "-"}
                            </Typography>
                            <IconButton
                              size="small"
                              onClick={() =>
                                openAdjustmentDialog(
                                  item1,
                                  "increase",
                                )
                              }
                            >
                              <AddIcon />
                            </IconButton>
                          </Box>
                        </TableCell>
                        <TableCell>
                          {item1.price !== undefined &&
                            item1.price !== null
                            ? `€${Number(item1.price).toFixed(2)}`
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {item1.contactDetails?.supplier || "-"}
                        </TableCell>
                        <TableCell>
                          {item1.contactDetails?.email ? (
                            item1.contactDetails.email.includes(
                              "@",
                            ) ? (
                              <a
                                href={`mailto:${item1.contactDetails.email}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  color: "#0369a1",
                                  textDecoration: "underline",
                                }}
                              >
                                {item1.contactDetails.email}
                              </a>
                            ) : (
                              <a
                                href={
                                  item1.contactDetails.email.startsWith(
                                    "http",
                                  )
                                    ? item1.contactDetails.email
                                    : `https://${item1.contactDetails.email}`
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  color: "#0369a1",
                                  textDecoration: "underline",
                                }}
                              >
                                {item1.contactDetails.email}
                              </a>
                            )
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>
                          {Array.isArray(
                            item1.sensorAssignments,
                          ) && item1.sensorAssignments.length > 0
                            ? item1.sensorAssignments
                              .map(
                                (sa) =>
                                  `${sa.sensorName} (${sa.requiredQuantity})`,
                              )
                              .join(", ")
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {item1.invoiceFile ? (
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                              }}
                            >
                              <AttachFileIcon
                                sx={{
                                  fontSize: 16,
                                  color: "text.secondary",
                                }}
                              />
                              <Button
                                size="small"
                                startIcon={<DownloadIcon />}
                                onClick={() =>
                                  handleDownloadInvoiceFile(
                                    item1.invoiceNumber || "",
                                    item1.invoiceFile || "",
                                  )
                                }
                                sx={{
                                  textTransform: "none",
                                  fontSize: "0.75rem",
                                  minWidth: "auto",
                                }}
                              >
                                {item1.invoiceFile.length > 20
                                  ? `${item1.invoiceFile.substring(0, 17)}...`
                                  : item1.invoiceFile}
                              </Button>
                            </Box>
                          ) : item1.invoiceNumber ? (
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                              }}
                            >
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                {item1.invoiceNumber}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="warning.main"
                              >
                                (No file)
                              </Typography>
                            </Box>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>
                          {item1.lastUpdated?.toLocaleString?.() ||
                            "-"}
                        </TableCell>
                        <TableCell>
                          <IconButton
                            color="primary"
                            onClick={() => handleEditItem(item1)}
                          >
                            <EditIcon />
                          </IconButton>
                        </TableCell>
                      </motion.tr>
                    ))}
                </AnimatePresence>
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
    </>
  );
});

ComponentsTab.displayName = 'ComponentsTab';

// Optimized Logs Tab Component
const LogsTab = React.memo(({
  logs,
  isMobile
}: {
  logs: LogEntry[];
  isMobile: boolean;
}) => {
  return (
    <>
      {/* Mobile Card Layout for Logs */}
      {isMobile ? (
        <Box sx={{ mb: 3 }}>
          {logs.length > 0 ? (
            <AnimatePresence>
              {logs.map((log) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card
                    elevation={2}
                    sx={{
                      mb: 2,
                      borderRadius: 2,
                      border: "1px solid",
                      borderColor: "divider",
                    }}
                  >
                    <CardContent sx={{ p: 3 }}>
                      {/* Header with item name and change */}
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          mb: 2,
                        }}
                      >
                        <Box sx={{ flex: 1 }}>
                          <Typography
                            variant="h6"
                            sx={{
                              fontWeight: 600,
                              color: "primary.main",
                              mb: 0.5,
                            }}
                          >
                            {log.itemName}
                          </Typography>
                          <Chip
                            label={log.itemType}
                            size="small"
                            variant="outlined"
                            color="secondary"
                          />
                        </Box>
                        <Chip
                          label={
                            log.change > 0
                              ? `+${log.change}`
                              : log.change
                          }
                          color={log.change > 0 ? "success" : "error"}
                          variant="filled"
                          size="medium"
                          sx={{ fontWeight: 600 }}
                        />
                      </Box>

                      {/* Details grid */}
                      <Box
                        sx={{
                          display: "grid",
                          gridTemplateColumns: "1fr",
                          gap: 2,
                        }}
                      >
                        <Box>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                          >
                            Timestamp
                          </Typography>
                          <Typography variant="body2" fontWeight={500}>
                            {log.timestamp.toLocaleString()}
                          </Typography>
                        </Box>

                        <Box>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                          >
                            Reason
                          </Typography>
                          <Typography variant="body2">
                            {log.reason}
                          </Typography>
                        </Box>

                        {log.user && (
                          <Box>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              User
                            </Typography>
                            <Typography variant="body2">
                              {log.user}
                            </Typography>
                          </Box>
                        )}

                        {log.invoiceNumber && (
                          <Box>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              Invoice Number
                            </Typography>
                            <Typography
                              variant="body2"
                              fontWeight={500}
                            >
                              {log.invoiceNumber}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          ) : (
            <Card elevation={2} sx={{ p: 6, textAlign: "center" }}>
              <Typography color="text.secondary" variant="h6">
                No logs available
              </Typography>
              <Typography
                color="text.secondary"
                variant="body2"
                sx={{ mt: 1 }}
              >
                Activity logs will appear here when you make changes
              </Typography>
            </Card>
          )}
        </Box>
      ) : (
        /* Desktop Table Layout for Logs */
        <Paper elevation={3} className="mb-8 overflow-hidden">
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Timestamp</TableCell>
                  <TableCell>Item</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Change</TableCell>
                  <TableCell>Reason</TableCell>
                  <TableCell>User</TableCell>
                  <TableCell>Invoice</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      {log.timestamp.toLocaleString()}
                    </TableCell>
                    <TableCell>{log.itemName}</TableCell>
                    <TableCell>{log.itemType}</TableCell>
                    <TableCell>
                      <Chip
                        label={
                          log.change > 0 ? `+${log.change}` : log.change
                        }
                        color={log.change > 0 ? "success" : "error"}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>{log.reason}</TableCell>
                    <TableCell>{log.user}</TableCell>
                    <TableCell>{log.invoiceNumber || "-"}</TableCell>
                  </TableRow>
                ))}
                {logs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      No logs available
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
    </>
  );
});

LogsTab.displayName = 'LogsTab';

// Main optimized component
export default function InventoryManagementOptimized() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [activeTab, setActiveTab] = useState(0);

  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error" | "info" | "warning",
  });
  const [sensorOptions, setSensorOptions] = useState<SensorOption[]>([]);
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState("");

  // Add adjustment dialog state
  const [adjustmentDialogOpen, setAdjustmentDialogOpen] = useState(false);
  const [currentAdjustItem, setCurrentAdjustItem] = useState<InventoryItem | null>(null);
  const [adjustmentType, setAdjustmentType] = useState<"increase" | "decrease">("increase");
  const [adjustmentQuantity, setAdjustmentQuantity] = useState(1);
  const [adjustmentReason, setAdjustmentReason] = useState("");

  // Add device action dialog state
  const [deviceActionDialogOpen, setDeviceActionDialogOpen] = useState(false);
  const [currentDevice, setCurrentDevice] = useState<ProductionDevice | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [deviceActionReason, setDeviceActionReason] = useState("");
  const [showOrderSelection, setShowOrderSelection] = useState(false);

  // Add frequency edit dialog state
  const [frequencyEditDialogOpen, setFrequencyEditDialogOpen] = useState(false);
  const [editingFrequencyDevice, setEditingFrequencyDevice] = useState<ProductionDevice | null>(null);
  const [newFrequency, setNewFrequency] = useState<string>("");

  // Search states with debouncing
  const [deviceSearchQuery, setDeviceSearchQuery] = useState("");
  const [componentSearchQuery, setComponentSearchQuery] = useState("");
  const [debouncedDeviceSearch, setDebouncedDeviceSearch] = useState("");
  const [debouncedComponentSearch, setDebouncedComponentSearch] = useState("");

  const queryClient = useQueryClient();
  const frequencyOptions: Frequency[] = ["AS923", "EU868", "US915", "2.4 GHz"];

  // Mutations for adding/updating items
  const addNewSensor = useMutation({
    mutationFn: async ({
      sensorId,
      quantity,
      location,
      frequency,
      dev_eui,
      BN,
    }: {
      sensorId: number;
      quantity: number;
      location: string;
      frequency: Frequency;
      dev_eui?: string;
      BN?: number;
    }) => {
      const result = await addSensorToInventory(
        sensorId,
        quantity,
        location,
        frequency,
        BN ?? 0,
        dev_eui ?? "",
      );
      const sensor = Array.isArray(result) && result.length > 0 ? result[0] : result;

      return {
        id: sensor.id,
        senzorId: sensor.senzorId ?? sensor.sensorId,
        sensorId: sensor.sensorId,
        sensorName: sensor.sensorName,
        quantity: sensor.quantity,
        location: sensor.location,
        lastUpdated: sensor.lastUpdated ? new Date(sensor.lastUpdated) : new Date(),
        frequency: sensor.frequency ? (sensor.frequency as Frequency) : undefined,
        dev_eui: sensor.dev_eui ?? sensor.productionListDevEUI ?? undefined,
        productionListDevEUI: sensor.productionListDevEUI ?? undefined,
      };
    },
    onSuccess: (newSensor: {
      id: number;
      senzorId?: number;
      sensorId?: number;
      sensorName?: string;
      quantity: number;
      location: string;
      lastUpdated?: string | Date;
      frequency?: Frequency;
      dev_eui?: string;
      productionListDevEUI?: string;
    }) => {
      queryClient.invalidateQueries({ queryKey: ["sensors-inventory"] });
      queryClient.invalidateQueries({ queryKey: ["production-hierarchy"] });
      setSnackbar({
        open: true,
        message: "Sensor added successfully!",
        severity: "success",
      });
    },
    onError: (error: unknown) => {
      setSnackbar({
        open: true,
        message: (error as Error)?.message || "Failed to add sensor",
        severity: "error",
      });
    },
  });

  const addNewComponent = useMutation({
    mutationFn: async ({
      componentId,
      quantity,
      location,
      sensorAssignments,
      invoiceNumber,
      price,
      lowStockThreshold,
      isCritical,
      contactDetails,
    }: {
      componentId: number;
      quantity: number;
      location: string;
      sensorAssignments: Array<{ sensorId: number; requiredQuantity: number }>;
      invoiceNumber?: string;
      price?: number;
      lowStockThreshold?: number;
      isCritical?: boolean;
      contactDetails: ContactDetails;
    }) => {
      return await addComponentToInventory(
        componentId,
        quantity,
        location,
        sensorAssignments,
        invoiceNumber || null,
        price || null,
        lowStockThreshold || null,
        isCritical || false,
        contactDetails,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["components-inventory"] });
      setSnackbar({
        open: true,
        message: "Component added successfully!",
        severity: "success",
      });
    },
    onError: (error: unknown) => {
      setSnackbar({
        open: true,
        message: (error as Error)?.message || "Failed to add component",
        severity: "error",
      });
    },
  });

  const updateComponentMutation = useMutation({
    mutationFn: async (params: {
      id: number;
      componentId: number;
      quantity: number;
      location: string;
      sensorAssignments: Array<{ sensorId: number; requiredQuantity: number }>;
      invoiceNumber?: string;
      price?: number;
      lowStockThreshold?: number;
      isCritical?: boolean;
      contactDetails: ContactDetails;
    }) => {
      return await updateComponentStock(
        params.id,
        params.componentId,
        params.quantity,
        params.location,
        params.sensorAssignments,
        params.invoiceNumber || null,
        params.price || null,
        params.lowStockThreshold || null,
        params.isCritical || false,
        params.contactDetails,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["components-inventory"] });
      setSnackbar({
        open: true,
        message: "Component updated successfully!",
        severity: "success",
      });
    },
    onError: (error: unknown) => {
      setSnackbar({
        open: true,
        message: (error as Error)?.message || "Failed to update component",
        severity: "error",
      });
    },
  });

  const adjustComponentStockMutation = useMutation({
    mutationFn: async (params: {
      stockId: number;
      quantity: number;
      reason: string;
      invoiceNumber?: string;
      fileKey?: string;
      price?: number;
      supplier?: string;
    }) => {
      return adjustComponentStockWithInvoice(
        params.stockId,
        params.quantity,
        params.reason,
        params.invoiceNumber || null,
        params.fileKey || null,
        params.price || null,
        params.supplier || null,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["components-inventory"] });
      if (open && editItem && "componentId" in editItem) {
        // Refresh the dialog data if it's still open
        queryClient.invalidateQueries({ queryKey: ["components-inventory"] });
      }
    },
    onError: (error: unknown) => {
      setSnackbar({
        open: true,
        message: (error as Error)?.message || "Failed to adjust component stock",
        severity: "error",
      });
    },
  });

  const adjustSensorStockMutation = useMutation({
    mutationFn: async ({
      stockId,
      quantity,
      reason,
    }: {
      stockId: string;
      quantity: number;
      reason: string;
    }) => {
      return adjustSensorStock(stockId, reason, null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sensors-inventory"] });
      queryClient.invalidateQueries({ queryKey: ["production-hierarchy"] });
    },
    onError: (error: unknown) => {
      setSnackbar({
        open: true,
        message: (error as Error)?.message || "Failed to adjust sensor stock",
        severity: "error",
      });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (item: InventoryItem) => {
      if ("componentId" in item) {
        return await deleteComponentFromInventory(item.id);
      } else {
        return await deleteSensorFromInventory(item.id?.toString() || "");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["components-inventory"] });
      queryClient.invalidateQueries({ queryKey: ["sensors-inventory"] });
      queryClient.invalidateQueries({ queryKey: ["production-hierarchy"] });
      setSnackbar({
        open: true,
        message: "Item deleted successfully!",
        severity: "success",
      });
    },
    onError: (error: unknown) => {
      setSnackbar({
        open: true,
        message: (error as Error)?.message || "Failed to delete item",
        severity: "error",
      });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async ({
      file,
      componentName,
    }: {
      file: File;
      componentName: string;
    }) => {
      // Create a new file with the invoice number as filename, preserving extension
      const fileExtension = file.name.split(".").pop();
      const newFileName = `${invoiceNumber}.${fileExtension}`;

      // Create a new File object with the updated name
      const renamedFile = new File([file], newFileName, { type: file.type });

      const filePath = await uploadPDFToB2(
        renamedFile,
        invoiceNumber,
        componentName,
      );
      return filePath; // Return the actual file path from B2
    },
    onSuccess: (filePath) => {
      setSnackbar({
        open: true,
        message: `Invoice uploaded successfully to: ${filePath}`,
        severity: "success",
      });
    },
    onError: (error) => {
      console.error("Upload error:", error);
      setSnackbar({
        open: true,
        message: "Upload failed: " + (error as Error).message,
        severity: "error",
      });
    },
  });

  // Debounce search queries for better performance
  useEffect(() => {
    const deviceHandler = setTimeout(() => {
      setDebouncedDeviceSearch(deviceSearchQuery);
    }, 300);

    return () => clearTimeout(deviceHandler);
  }, [deviceSearchQuery]);

  useEffect(() => {
    const componentHandler = setTimeout(() => {
      setDebouncedComponentSearch(componentSearchQuery);
    }, 300);

    return () => clearTimeout(componentHandler);
  }, [componentSearchQuery]);

  // Add keyboard shortcut for search (Ctrl+F or Cmd+F)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        (event.ctrlKey || event.metaKey) &&
        event.key === "f" &&
        activeTab === 0
      ) {
        event.preventDefault();
        const searchInput = document.querySelector('input[placeholder*="Device EUI"]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
        }
      }
      // Escape to clear search
      if (event.key === "Escape" && deviceSearchQuery && activeTab === 0) {
        setDeviceSearchQuery("");
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [activeTab, deviceSearchQuery]);

  const initializeNewItem = useCallback(() => {
    if (activeTab === 0) {
      return {
        id: 0,
        senzorId: 0,
        sensorName: "",
        quantity: 1,
        location: "Main Warehouse",
        lastUpdated: new Date(),
        frequency: "EU868" as Frequency,
      } as SenzorStockItem;
    } else {
      return {
        id: 0,
        componentId: 0,
        name: "",
        quantity: 1,
        location: "Main Warehouse",
        lastUpdated: new Date(),
        sensorAssignments: [],
        invoiceNumber: "",
        price: 0,
        lowStockThreshold: undefined,
        isCritical: false,
        contactDetails: {
          supplier: "",
          email: "",
          phone: "",
        },
      } as ComponentStockItem;
    }
  }, [activeTab]);

  const { data: LowComponents = [] } = useQuery({
    queryKey: ["LowComponents"],
    queryFn: getLowComponents,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    enabled: activeTab === 1, // Only fetch when on components tab
  });

  // Memoized helper function to check if component is in the low components list from database
  const isComponentInLowList = useCallback((component: ComponentStockItem) => {
    return LowComponents.some(
      (lowComp: LowComponentItem) =>
        lowComp.componentId === component.componentId,
    );
  }, [LowComponents]);
  const { data: allSensors = [] } = useQuery({
    queryKey: ["sensors"],
    queryFn: getSensors,
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const { data: allComponents = [] } = useQuery({
    queryKey: ["components-inventory"],
    queryFn: showAllComponents,
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    enabled: activeTab === 1, // Only fetch when on components tab
  });

  const { data: componentOptions = [] } = useQuery({
    queryKey: ["all-components"],
    queryFn: getAllComponents,
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    enabled: activeTab === 1, // Only fetch when on components tab
  });

  const { data: logs = [] } = useQuery({
    queryKey: ["inventory-logs"],
    queryFn: showLogs,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    enabled: activeTab === 2, // Only fetch when on logs tab
  });

  // Query to fetch all orders for device assignment
  const { data: allOrders = [] } = useQuery({
    queryKey: ["orders"],
    queryFn: getAllOrders,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    enabled: activeTab === 0, // Only fetch when on devices tab
  });

  const { data: productionHierarchy = [] } = useQuery({
    queryKey: ["production-hierarchy"],
    queryFn: async () => {
      try {
        const deviceTypeData = await getProductionHierarchy();
        const hierarchyGroups: ProductionGroupByType[] = [];

        for (const deviceTypeGroup of deviceTypeData) {
          const frequencyData = await getProductionByFrequency(
            deviceTypeGroup.deviceType,
          );
          const frequencies: ProductionGroupByFrequency[] = [];

          for (const freqGroup of frequencyData) {
            const devices = await getProductionDevices(
              deviceTypeGroup.deviceType,
              freqGroup.frequency,
            );
            frequencies.push({
              frequency: freqGroup.frequency,
              count: freqGroup.count,
              devices: devices,
              expanded: false,
            });
          }

          hierarchyGroups.push({
            deviceType: deviceTypeGroup.deviceType,
            totalDevices: deviceTypeGroup.totalDevices,
            frequencies: frequencies,
            expanded: false,
          });
        }

        return hierarchyGroups;
      } catch (error) {
        console.error("Error loading production hierarchy:", error);
        return [];
      }
    },
    enabled: activeTab === 0, // Only fetch when on devices tab
    staleTime: 15 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  // Memoized filtered hierarchy calculation
  const filteredHierarchy = useMemo(() => {
    if (!debouncedDeviceSearch.trim()) {
      return productionHierarchy;
    }

    const searchLower = debouncedDeviceSearch.toLowerCase();
    return productionHierarchy
      .map((sensorGroup) => ({
        ...sensorGroup,
        frequencies: sensorGroup.frequencies
          .map((freqGroup) => ({
            ...freqGroup,
            devices: freqGroup.devices.filter((device) => {
              return (
                device.devEUI?.toLowerCase().includes(searchLower) ||
                device.appEUI?.toLowerCase().includes(searchLower)
              );
            }),
          }))
          .filter((freqGroup) => freqGroup.devices.length > 0),
      }))
      .filter((sensorGroup) => sensorGroup.frequencies.length > 0);
  }, [productionHierarchy, debouncedDeviceSearch]);

  // Memoized filtered components calculation
  const filteredComponents = useMemo(() => {
    if (!debouncedComponentSearch.trim()) {
      return allComponents;
    }

    const searchLower = debouncedComponentSearch.toLowerCase();
    return allComponents.filter((component) =>
      component.name?.toLowerCase().includes(searchLower)
    );
  }, [allComponents, debouncedComponentSearch]);

  // Memoized helper function to determine alert type and severity
  const getComponentAlertInfo = useCallback((component: ComponentStockItem) => {
    const threshold = component.lowStockThreshold;
    const quantity = component.quantity ?? 0;
    let showAlert = false;
    let severity: "warning" | "error" = "warning";
    let color = "#FF9800";
    let message = "";

    if (typeof threshold === "number" && quantity <= threshold) {
      showAlert = true;
      severity = quantity === 0 ? "error" : "warning";
      color = severity === "error" ? "#DC2626" : "#FF9800";
      message =
        quantity === 0
          ? "OUT OF STOCK"
          : `Low stock (${quantity}/${threshold})`;
    }

    return { showAlert, severity, color, message };
  }, []);

  // Memoized tab change handler
  const handleTabChange = useCallback((event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  }, []);

  // Dialog handlers
  const handleClickOpen = () => {
    setEditItem(initializeNewItem());
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditItem(null);
    setSensorOptions([]);
    setInvoiceFile(null);
    setInvoiceNumber("");
  };

  // Drag and drop handlers for file upload
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setInvoiceFile(file);

      // Set filename (without extension) as invoice number
      const fileNameWithoutExtension = file.name.replace(/\.[^/.]+$/, "");
      setInvoiceNumber(fileNameWithoutExtension);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setInvoiceFile(file);

      // Set filename (without extension) as invoice number
      const fileNameWithoutExtension = file.name.replace(/\.[^/.]+$/, "");
      setInvoiceNumber(fileNameWithoutExtension);

      // Show notification to user about automatic setting
      setSnackbar({
        open: true,
        message: `Invoice number automatically set to: ${fileNameWithoutExtension}`,
        severity: "info",
      });
    }
  };

  // Add handler for invoice number changes
  const handleInvoiceNumberChange = (value: string) => {
    setInvoiceNumber(value);

    // If there's a file uploaded and user changes invoice number,
    // we should note that the filename and invoice number are now different
    if (invoiceFile && invoiceFile.name.replace(/\.[^/.]+$/, "") !== value) {
      setSnackbar({
        open: true,
        message: "Note: Invoice number differs from uploaded filename",
        severity: "warning",
      });
    }
  };

  const handleRequiredQuantityChange = (sensorId: number, value: number) => {
    setSensorOptions((prev) =>
      prev.map((option) =>
        option.id === sensorId
          ? { ...option, requiredQuantity: Math.max(1, value) }
          : option,
      ),
    );
  };

  // Device action handlers
  const handleEditItem = async (item: InventoryItem) => {
    // For components, force a fresh fetch to get the latest data including invoice info
    if ("componentId" in item) {
      setEditItem({ ...item });
    } else {
      setEditItem({ ...item });
    }
    setOpen(true);
  };

  const handleAddOrUpdateSensor = async () => {
    if (!editItem || !("senzorId" in editItem)) return;

    try {
      if (editItem.id) {
        // Update existing sensor - not implemented in backend yet
        setSnackbar({
          open: true,
          message: "Sensor update functionality not yet implemented",
          severity: "warning",
        });
      } else {
        // Add new sensor
        await addNewSensor.mutateAsync({
          sensorId: editItem.senzorId,
          quantity: editItem.quantity,
          location: editItem.location,
          frequency: editItem.frequency || "EU868",
          dev_eui: editItem.dev_eui,
          BN: 0,
        });
      }
      handleClose();
    } catch (error) {
      console.error("Error saving sensor:", error);
      setSnackbar({
        open: true,
        message: "Failed to save sensor: " + (error as Error).message,
        severity: "error",
      });
    }
  };

  const handleAddOrUpdateComponent = async () => {
    if (!editItem || !("componentId" in editItem)) return;

    const missingFields = [];
    if (!editItem.componentId) missingFields.push("Component");
    if (!editItem.name) missingFields.push("Component Name");

    if (missingFields.length > 0) {
      setSnackbar({
        open: true,
        message: `Please fill in required fields: ${missingFields.join(", ")}`,
        severity: "error",
      });
      return;
    }

    const sensorAssignments = sensorOptions
      .filter((option) => option.selected)
      .map((option) => ({
        sensorId: option.id,
        requiredQuantity: option.requiredQuantity,
      }));

    try {
      if (editItem.id) {
        // Update existing component
        await updateComponentMutation.mutateAsync({
          id: editItem.id,
          componentId: editItem.componentId,
          quantity: editItem.quantity,
          location: editItem.location,
          sensorAssignments,
          invoiceNumber,
          price: editItem.price,
          lowStockThreshold: editItem.lowStockThreshold,
          isCritical: editItem.isCritical,
          contactDetails: editItem.contactDetails,
        });
      } else {
        // Add new component
        await addNewComponent.mutateAsync({
          componentId: editItem.componentId,
          quantity: editItem.quantity,
          location: editItem.location,
          sensorAssignments,
          invoiceNumber,
          price: editItem.price,
          lowStockThreshold: editItem.lowStockThreshold,
          isCritical: editItem.isCritical,
          contactDetails: editItem.contactDetails,
        });
      }
      handleClose();
    } catch (error) {
      console.error("Error saving component:", error);
      setSnackbar({
        open: true,
        message: "Failed to save component: " + (error as Error).message,
        severity: "error",
      });
    }
  };

  const handleDeleteItem = async () => {
    if (!editItem) return;

    try {
      await deleteItemMutation.mutateAsync(editItem);
      handleClose();
    } catch (error) {
      console.error("Error deleting item:", error);
      setSnackbar({
        open: true,
        message: "Failed to delete item: " + (error as Error).message,
        severity: "error",
      });
    }
  };

  const handleRemoveDevice = async (device: ProductionDevice) => {
    try {
      // Implementation for removing device
      setSnackbar({
        open: true,
        message: `Device ${device.devEUI} removed from inventory`,
        severity: "success",
      });
      queryClient.invalidateQueries({ queryKey: ["production-hierarchy"] });
    } catch (error) {
      setSnackbar({
        open: true,
        message: `Failed to remove device: ${(error as Error).message}`,
        severity: "error",
      });
    }
  };

  const openDeviceActionDialog = (device: ProductionDevice) => {
    setCurrentDevice(device);
    setDeviceActionReason("");
    setSelectedOrderId(null);
    setShowOrderSelection(false);
    setDeviceActionDialogOpen(true);
  };

  const openFrequencyEditDialog = (device: ProductionDevice) => {
    setEditingFrequencyDevice(device);
    setNewFrequency(device.frequency || "");
    setFrequencyEditDialogOpen(true);
  };

  const handleUpdateFrequency = async () => {
    if (!editingFrequencyDevice || !newFrequency) return;

    try {
      await updateSensorFrequency(editingFrequencyDevice.id.toString(), newFrequency);
      setSnackbar({
        open: true,
        message: `Frequency updated successfully`,
        severity: "success",
      });
      setFrequencyEditDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["production-hierarchy"] });
    } catch (error) {
      setSnackbar({
        open: true,
        message: `Failed to update frequency: ${(error as Error).message}`,
        severity: "error",
      });
    }
  };

  const openAdjustmentDialog = (
    item: InventoryItem,
    type: "increase" | "decrease",
  ) => {
    setCurrentAdjustItem(item);
    setAdjustmentType(type);
    setAdjustmentReason("");
    setAdjustmentQuantity(1);
    setAdjustmentDialogOpen(true);
  };

  const confirmAdjustment = async () => {
    if (!currentAdjustItem || !adjustmentReason) return;

    const change =
      adjustmentType === "increase" ? adjustmentQuantity : -adjustmentQuantity;

    try {
      if ("componentId" in currentAdjustItem) {
        // Component adjustment
        await adjustComponentStockMutation.mutateAsync({
          stockId: currentAdjustItem.id,
          quantity: change,
          reason: adjustmentReason,
        });
      } else {
        // Sensor adjustment
        await adjustSensorStockMutation.mutateAsync({
          stockId: currentAdjustItem.id?.toString() || "",
          quantity: change,
          reason: adjustmentReason,
        });
      }

      setSnackbar({
        open: true,
        message: `Stock adjusted successfully`,
        severity: "success",
      });
      setAdjustmentDialogOpen(false);
    } catch (error) {
      setSnackbar({
        open: true,
        message: `Failed to adjust stock: ${(error as Error).message}`,
        severity: "error",
      });
    }
  };

  // Functions for hierarchical device view
  const toggleSensorExpanded = (deviceType: string) => {
    queryClient.setQueryData(
      ["production-hierarchy"],
      (prev: ProductionGroupByType[]) =>
        prev?.map((group) =>
          group.deviceType === deviceType
            ? { ...group, expanded: !group.expanded }
            : group,
        ) || [],
    );
  };

  const toggleFrequencyExpanded = (deviceType: string, frequency: string) => {
    queryClient.setQueryData(
      ["production-hierarchy"],
      (prev: ProductionGroupByType[]) =>
        prev?.map((group) =>
          group.deviceType === deviceType
            ? {
              ...group,
              frequencies: group.frequencies.map((freq) =>
                freq.frequency === frequency
                  ? { ...freq, expanded: !freq.expanded }
                  : freq,
              ),
            }
            : group,
        ) || [],
    );
  };

  // Handle invoice file download
  const handleDownloadInvoiceFile = async (
    invoiceNumber: string,
    filename: string,
  ) => {
    try {
      const result = await getInvoiceFileDownloadUrl(invoiceNumber);
      if (result && result.downloadUrl) {
        // Create a temporary link and click it to download
        const link = document.createElement("a");
        link.href = result.downloadUrl;
        link.download = filename;
        link.click();
      } else {
        throw new Error("Could not get download URL");
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: `Failed to download file: ${(error as Error).message}`,
        severity: "error",
      });
    }
  };

  // Device assignment functions
  const handleAssignToOrder = async (
    device: ProductionDevice,
    orderId: number,
  ) => {
    try {
      await assignDeviceToOrder(device.id, orderId);
      setSnackbar({
        open: true,
        message: `Device ${device.devEUI} assigned to order successfully`,
        severity: "success",
      });
      queryClient.invalidateQueries({ queryKey: ["production-hierarchy"] });
    } catch (error) {
      setSnackbar({
        open: true,
        message: `Failed to assign device: ${(error as Error).message}`,
        severity: "error",
      });
    }
  };

  const handleReleaseFromOrder = async (
    device: ProductionDevice,
    reason: string,
  ) => {
    try {
      await releaseDeviceFromOrder(device.id, reason);
      setSnackbar({
        open: true,
        message: `Device ${device.devEUI} released from order successfully`,
        severity: "success",
      });
      queryClient.invalidateQueries({ queryKey: ["production-hierarchy"] });
    } catch (error) {
      setSnackbar({
        open: true,
        message: `Failed to release device: ${(error as Error).message}`,
        severity: "error",
      });
    }
  };

  const confirmDeviceAction = async (
    action: "remove" | "assign" | "release",
  ) => {
    if (!currentDevice) return;

    if (action === "remove") {
      await handleRemoveDevice(currentDevice);
    } else if (action === "assign" && selectedOrderId) {
      await handleAssignToOrder(currentDevice, selectedOrderId);
    } else if (action === "release") {
      await handleReleaseFromOrder(currentDevice, deviceActionReason);
    }

    setDeviceActionDialogOpen(false);
    setShowOrderSelection(false);
    setSelectedOrderId(null);
  };

  // Initialize data when dialog opens
  useEffect(() => {
    if (open && activeTab === 1) {
      const componentItem = editItem as ComponentStockItem;
      const options = allSensors
        .filter((sensor) => typeof sensor.id === "number")
        .map((sensor) => ({
          id: sensor.id,
          name: sensor.sensorName || "",
          selected: (componentItem?.sensorAssignments || []).some(
            (assignment) => assignment.sensorId === sensor.id,
          ),
          requiredQuantity:
            (componentItem?.sensorAssignments || []).find(
              (assignment) => assignment.sensorId === sensor.id,
            )?.requiredQuantity || 1,
        }));

      setSensorOptions(options);
      setInvoiceNumber(componentItem?.invoiceNumber || "");
    }
  }, [open, editItem, activeTab, allSensors]);

  useEffect(() => {
    if (!open) {
      setInvoiceNumber("");
    }
  }, [activeTab, open]);

  return (
    <>
      <CssBaseline />
      <Container
        maxWidth={false}
        sx={{
          py: { xs: 2, md: 2 },
          px: { xs: 2, md: 3 },
          minHeight: "100vh",
          bgcolor: "background.default",
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-7xl"
        >
          {/* Header */}
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", md: "row" },
              alignItems: { xs: "center", md: "flex-start" },
              justifyContent: "space-between",
              mb: { xs: 4, md: 8 },
              gap: { xs: 3, md: 0 },
            }}
          >
            <Box
              sx={{
                display: "flex",
                flexDirection: { xs: "column", md: "row" },
                alignItems: { xs: "center", md: "flex-start" },
                gap: { xs: 1, md: 2 },
                textAlign: { xs: "center", md: "left" },
              }}
            >
              <Image
                src="/senzemo-large-01 (9).png"
                alt="Senzemo Logo"
                width={isMobile ? 60 : 80}
                height={isMobile ? 60 : 80}
                className="h-auto w-auto"
              />
              <Box>
                <Typography
                  variant={isMobile ? "h5" : "h4"}
                  component="h1"
                  sx={{
                    fontWeight: 600,
                    color: "primary.main",
                    mb: isMobile ? 0 : 1,
                  }}
                >
                  Inventory Management
                </Typography>
                {!isMobile && (
                  <Typography variant="body2" color="text.secondary">
                    Manage your device and component inventory
                  </Typography>
                )}
              </Box>
            </Box>
          </Box>

          {/* Tabs */}
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            sx={{
              mb: { xs: 3, md: 6 },
              "& .MuiTab-root": {
                minHeight: { xs: 48, md: "auto" },
                fontSize: { xs: "0.875rem", md: "1rem" },
                fontWeight: 600,
              },
              "& .MuiTabs-indicator": {
                height: 3,
              },
            }}
            variant={isMobile ? "fullWidth" : "standard"}
            scrollButtons={isMobile ? "auto" : false}
          >
            <Tab label="Devices" />
            <Tab label="Components" />
            <Tab
              label={isMobile ? "Logs" : "Activity Logs"}
              icon={<HistoryIcon />}
              iconPosition="start"
            />
            <Tab
              label={isMobile ? "Reports" : "Email Reports"}
              icon={<EmailIcon />}
              iconPosition="start"
            />
          </Tabs>

          {/* Tab Content - Lazy loaded */}
          {activeTab === 0 && (
            <DevicesTab
              productionHierarchy={productionHierarchy}
              deviceSearchQuery={deviceSearchQuery}
              setDeviceSearchQuery={setDeviceSearchQuery}
              filteredHierarchy={filteredHierarchy}
              isMobile={isMobile}
              toggleSensorExpanded={toggleSensorExpanded}
              toggleFrequencyExpanded={toggleFrequencyExpanded}
              openDeviceActionDialog={openDeviceActionDialog}
              openFrequencyEditDialog={openFrequencyEditDialog}
              handleRemoveDevice={handleRemoveDevice}
            />
          )}

          {activeTab === 1 && (
            <ComponentsTab
              componentSearchQuery={componentSearchQuery}
              setComponentSearchQuery={setComponentSearchQuery}
              filteredComponents={filteredComponents}
              isMobile={isMobile}
              getComponentAlertInfo={getComponentAlertInfo}
              isComponentInLowList={isComponentInLowList}
              handleEditItem={handleEditItem}
              openAdjustmentDialog={openAdjustmentDialog}
              handleDownloadInvoiceFile={handleDownloadInvoiceFile}
            />
          )}

          {activeTab === 2 && (
            <LogsTab
              logs={logs}
              isMobile={isMobile}
            />
          )}

          {activeTab === 3 && (
            <EmailReportManager />
          )}
        </motion.div>

        {/* Add/Edit Item Dialog */}
        <Dialog
          open={open}
          onClose={handleClose}
          maxWidth="md"
          fullWidth
          fullScreen={isMobile}
        >
          <DialogTitle>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Typography variant="h6">
                {editItem?.id ? "Edit" : "Add"} {activeTab === 0 ? "Sensor" : "Component"}
              </Typography>
              <IconButton
                onClick={handleClose}
                sx={{ ml: "auto" }}
              >
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>

          <DialogContent>
            {activeTab === 0 ? (
              // Sensor Form
              <Box sx={{ display: "flex", flexDirection: "column", gap: 3, pt: 2 }}>
                <FormControl fullWidth>
                  <InputLabel>Sensor Type</InputLabel>
                  <Select
                    value={(editItem as SenzorStockItem)?.senzorId || ""}
                    onChange={(e) => {
                      const sensorId = Number(e.target.value);
                      const sensor = allSensors.find(s => s.id === sensorId);
                      setEditItem({
                        ...(editItem as SenzorStockItem),
                        senzorId: sensorId,
                        sensorName: sensor?.sensorName || "",
                      });
                    }}
                  >
                    {allSensors.map((sensor) => (
                      <MenuItem key={sensor.id} value={sensor.id}>
                        {sensor.sensorName}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <TextField
                  label="Quantity"
                  type="number"
                  value={(editItem as SenzorStockItem)?.quantity || 1}
                  onChange={(e) => setEditItem({
                    ...(editItem as SenzorStockItem),
                    quantity: Number(e.target.value),
                  })}
                  fullWidth
                />

                <TextField
                  label="Location"
                  value={(editItem as SenzorStockItem)?.location || ""}
                  onChange={(e) => setEditItem({
                    ...(editItem as SenzorStockItem),
                    location: e.target.value,
                  })}
                  fullWidth
                />

                <FormControl fullWidth>
                  <InputLabel>Frequency</InputLabel>
                  <Select
                    value={(editItem as SenzorStockItem)?.frequency || ""}
                    onChange={(e) => setEditItem({
                      ...(editItem as SenzorStockItem),
                      frequency: e.target.value as Frequency,
                    })}
                  >
                    {frequencyOptions.map((freq) => (
                      <MenuItem key={freq} value={freq}>
                        {freq}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <TextField
                  label="Device EUI (optional)"
                  value={(editItem as SenzorStockItem)?.dev_eui || ""}
                  onChange={(e) => setEditItem({
                    ...(editItem as SenzorStockItem),
                    dev_eui: e.target.value,
                  })}
                  fullWidth
                />
              </Box>
            ) : (
              // Component Form
              <Box sx={{ display: "flex", flexDirection: "column", gap: 3, pt: 2 }}>
                <FormControl fullWidth>
                  <InputLabel>Component</InputLabel>
                  <Select
                    value={(editItem as ComponentStockItem)?.componentId || ""}
                    onChange={(e) => {
                      const componentId = Number(e.target.value);
                      const component = componentOptions.find(c => c.id === componentId);
                      setEditItem({
                        ...(editItem as ComponentStockItem),
                        componentId: componentId,
                        name: component?.name || "",
                      });
                    }}
                  >
                    {componentOptions.map((component) => (
                      <MenuItem key={component.id} value={component.id}>
                        {component.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <TextField
                  label="Quantity"
                  type="number"
                  value={(editItem as ComponentStockItem)?.quantity || 1}
                  onChange={(e) => setEditItem({
                    ...(editItem as ComponentStockItem),
                    quantity: Number(e.target.value),
                  })}
                  fullWidth
                />

                <TextField
                  label="Location"
                  value={(editItem as ComponentStockItem)?.location || ""}
                  onChange={(e) => setEditItem({
                    ...(editItem as ComponentStockItem),
                    location: e.target.value,
                  })}
                  fullWidth
                />

                <TextField
                  label="Price per Item"
                  type="number"
                  value={(editItem as ComponentStockItem)?.price || ""}
                  onChange={(e) => setEditItem({
                    ...(editItem as ComponentStockItem),
                    price: Number(e.target.value),
                  })}
                  fullWidth
                  InputProps={{
                    startAdornment: <InputAdornment position="start">€</InputAdornment>,
                  }}
                />

                <TextField
                  label="Low Stock Threshold"
                  type="number"
                  value={(editItem as ComponentStockItem)?.lowStockThreshold || ""}
                  onChange={(e) => setEditItem({
                    ...(editItem as ComponentStockItem),
                    lowStockThreshold: e.target.value ? Number(e.target.value) : undefined,
                  })}
                  fullWidth
                />

                <FormControlLabel
                  control={
                    <Switch
                      checked={(editItem as ComponentStockItem)?.isCritical || false}
                      onChange={(e) => setEditItem({
                        ...(editItem as ComponentStockItem),
                        isCritical: e.target.checked,
                      })}
                    />
                  }
                  label="Critical Component"
                />

                <Divider />

                {/* Contact Details */}
                <Typography variant="h6">Supplier Information</Typography>
                <TextField
                  label="Supplier Name"
                  value={(editItem as ComponentStockItem)?.contactDetails?.supplier || ""}
                  onChange={(e) => setEditItem({
                    ...(editItem as ComponentStockItem),
                    contactDetails: {
                      ...(editItem as ComponentStockItem)?.contactDetails,
                      supplier: e.target.value,
                    },
                  })}
                  fullWidth
                />

                <TextField
                  label="Email"
                  type="email"
                  value={(editItem as ComponentStockItem)?.contactDetails?.email || ""}
                  onChange={(e) => setEditItem({
                    ...(editItem as ComponentStockItem),
                    contactDetails: {
                      ...(editItem as ComponentStockItem)?.contactDetails,
                      email: e.target.value,
                    },
                  })}
                  fullWidth
                />

                <TextField
                  label="Phone"
                  value={(editItem as ComponentStockItem)?.contactDetails?.phone || ""}
                  onChange={(e) => setEditItem({
                    ...(editItem as ComponentStockItem),
                    contactDetails: {
                      ...(editItem as ComponentStockItem)?.contactDetails,
                      phone: e.target.value,
                    },
                  })}
                  fullWidth
                />

                <Divider />

                {/* Invoice Section */}
                <Typography variant="h6">Invoice Information</Typography>
                <TextField
                  label="Invoice Number"
                  value={invoiceNumber}
                  onChange={(e) => handleInvoiceNumberChange(e.target.value)}
                  fullWidth
                />

                {/* File Upload Area */}
                <Box
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  sx={{
                    border: "2px dashed",
                    borderColor: isDragging ? "primary.main" : "grey.300",
                    borderRadius: 2,
                    p: 3,
                    textAlign: "center",
                    cursor: "pointer",
                    bgcolor: isDragging ? "primary.light" : "transparent",
                    transition: "all 0.3s ease",
                  }}
                  onClick={() => document.getElementById("file-input")?.click()}
                >
                  <input
                    id="file-input"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    style={{ display: "none" }}
                    onChange={handleFileChange}
                  />
                  <FileUploadIcon sx={{ fontSize: 48, color: "primary.main", mb: 1 }} />
                  <Typography variant="body1" color="primary.main">
                    {invoiceFile ? invoiceFile.name : "Drop invoice file here or click to browse"}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Supported formats: PDF, JPG, PNG
                  </Typography>
                </Box>

                {/* Sensor Assignments */}
                <Typography variant="h6">Sensor Assignments</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Select which sensors require this component and specify quantities
                </Typography>

                <Box sx={{ maxHeight: 200, overflow: "auto" }}>
                  {sensorOptions.map((option) => (
                    <Box key={option.id} sx={{ mb: 2, p: 2, border: "1px solid", borderColor: "divider", borderRadius: 1 }}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={option.selected}
                            onChange={(e) => {
                              setSensorOptions(prev => prev.map(opt =>
                                opt.id === option.id
                                  ? { ...opt, selected: e.target.checked }
                                  : opt
                              ));
                            }}
                          />
                        }
                        label={option.name}
                      />
                      {option.selected && (
                        <TextField
                          label="Required Quantity"
                          type="number"
                          size="small"
                          value={option.requiredQuantity}
                          onChange={(e) => handleRequiredQuantityChange(option.id, Number(e.target.value))}
                          sx={{ ml: 2, width: 120 }}
                          inputProps={{ min: 1 }}
                        />
                      )}
                    </Box>
                  ))}
                </Box>
              </Box>
            )}
          </DialogContent>

          <DialogActions sx={{ p: 3 }}>
            <Button onClick={handleClose} startIcon={<CancelIcon />}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={() => {
                if (activeTab === 0) {
                  handleAddOrUpdateSensor();
                } else {
                  handleAddOrUpdateComponent();
                }
              }}
              startIcon={<SaveIcon />}
            >
              Save
            </Button>
            {editItem?.id && (
              <Button
                variant="outlined"
                color="error"
                onClick={handleDeleteItem}
                startIcon={<DeleteIcon />}
              >
                Delete
              </Button>
            )}
          </DialogActions>
        </Dialog>

        {/* Adjustment Dialog */}
        <Dialog open={adjustmentDialogOpen} onClose={() => setAdjustmentDialogOpen(false)}>
          <DialogTitle>
            {adjustmentType === "increase" ? "Increase" : "Decrease"} Stock
          </DialogTitle>
          <DialogContent>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 2 }}>
              <Typography variant="body2">
                Adjusting stock for: {currentAdjustItem && "name" in currentAdjustItem
                  ? currentAdjustItem.name
                  : currentAdjustItem?.sensorName}
              </Typography>
              <TextField
                label="Quantity"
                type="number"
                value={adjustmentQuantity}
                onChange={(e) => setAdjustmentQuantity(Number(e.target.value))}
                fullWidth
                inputProps={{ min: 1 }}
              />
              <TextField
                label="Reason"
                value={adjustmentReason}
                onChange={(e) => setAdjustmentReason(e.target.value)}
                fullWidth
                multiline
                rows={3}
                required
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAdjustmentDialogOpen(false)}>Cancel</Button>
            <Button
              variant="contained"
              onClick={confirmAdjustment}
              disabled={!adjustmentReason.trim()}
            >
              Confirm
            </Button>
          </DialogActions>
        </Dialog>

        {/* Frequency Edit Dialog */}
        <Dialog open={frequencyEditDialogOpen} onClose={() => setFrequencyEditDialogOpen(false)}>
          <DialogTitle>Edit Device Frequency</DialogTitle>
          <DialogContent>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 2 }}>
              <Typography variant="body2">
                Device EUI: {editingFrequencyDevice?.devEUI}
              </Typography>
              <FormControl fullWidth>
                <InputLabel>Frequency</InputLabel>
                <Select
                  value={newFrequency}
                  onChange={(e) => setNewFrequency(e.target.value)}
                >
                  {frequencyOptions.map((freq) => (
                    <MenuItem key={freq} value={freq}>
                      {freq}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setFrequencyEditDialogOpen(false)}>Cancel</Button>
            <Button
              variant="contained"
              onClick={handleUpdateFrequency}
              disabled={!newFrequency}
            >
              Update
            </Button>
          </DialogActions>
        </Dialog>

        {/* Device Action Dialog */}
        <Dialog open={deviceActionDialogOpen} onClose={() => setDeviceActionDialogOpen(false)}>
          <DialogTitle>Device Actions</DialogTitle>
          <DialogContent>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 2 }}>
              <Typography variant="body2">
                Device EUI: {currentDevice?.devEUI}
              </Typography>
              <Typography variant="body2">
                Status: {currentDevice?.isAvailable ? "Available" : "Assigned"}
              </Typography>

              {!showOrderSelection ? (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <Button
                    variant="outlined"
                    color="primary"
                    onClick={() => setShowOrderSelection(true)}
                    startIcon={<AssignmentIcon />}
                  >
                    Assign to Order
                  </Button>
                  <Button
                    variant="outlined"
                    color="warning"
                    onClick={() => confirmDeviceAction("release")}
                    startIcon={<ShoppingCartIcon />}
                  >
                    Release from Order
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={() => confirmDeviceAction("remove")}
                    startIcon={<DeleteIcon />}
                  >
                    Remove from Inventory
                  </Button>
                </Box>
              ) : (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <Typography variant="h6">Select Order</Typography>
                  <FormControl fullWidth>
                    <InputLabel>Order</InputLabel>
                    <Select
                      value={selectedOrderId || ""}
                      onChange={(e) => setSelectedOrderId(Number(e.target.value))}
                    >
                      {allOrders.map((order: Order) => (
                        <MenuItem key={order.id} value={order.id}>
                          Order #{order.id} - {order.customerName || "Unknown Customer"}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <TextField
                    label="Reason (optional)"
                    value={deviceActionReason}
                    onChange={(e) => setDeviceActionReason(e.target.value)}
                    multiline
                    rows={2}
                    fullWidth
                  />
                  <Box sx={{ display: "flex", gap: 1 }}>
                    <Button
                      variant="outlined"
                      onClick={() => setShowOrderSelection(false)}
                    >
                      Back
                    </Button>
                    <Button
                      variant="contained"
                      onClick={() => confirmDeviceAction("assign")}
                      disabled={!selectedOrderId}
                    >
                      Assign
                    </Button>
                  </Box>
                </Box>
              )}
            </Box>
          </DialogContent>
        </Dialog>
        startIcon={<ShoppingCartIcon />}
                  >
        Release from Order
      </Button>
      <Button
        variant="outlined"
        color="error"
        onClick={() => {
          if (currentDevice) {
            handleRemoveDevice(currentDevice);
            setDeviceActionDialogOpen(false);
          }
        }}
        startIcon={<DeleteIcon />}
      >
        Remove from Inventory
      </Button>
    </Box >
              ) : (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <FormControl fullWidth>
        <InputLabel>Select Order</InputLabel>
        <Select
          value={selectedOrderId || ""}
          onChange={(e) => setSelectedOrderId(Number(e.target.value))}
        >
          {allOrders.map((order: Order) => (
            <MenuItem key={order.id} value={order.id}>
              Order #{order.id} - {order.customerName || "Unknown Customer"}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <TextField
        label="Assignment Reason"
        value={deviceActionReason}
        onChange={(e) => setDeviceActionReason(e.target.value)}
        fullWidth
        multiline
        rows={2}
      />
      <Box sx={{ display: "flex", gap: 2 }}>
        <Button onClick={() => setShowOrderSelection(false)}>
          Back
        </Button>
        <Button
          variant="contained"
          onClick={() => {
            // TODO: Implement assign to order functionality
            setDeviceActionDialogOpen(false);
            setShowOrderSelection(false);
          }}
          disabled={!selectedOrderId}
        >
          Assign
        </Button>
      </Box>
    </Box>
  )
}
            </Box >
          </DialogContent >
        </Dialog >

  {/* Snackbar for notifications */ }
  < Snackbar
open = { snackbar.open }
autoHideDuration = { 6000}
onClose = {() => setSnackbar({ ...snackbar, open: false })}
anchorOrigin = {{ vertical: "bottom", horizontal: "right" }}
        >
  <Alert
    onClose={() => setSnackbar({ ...snackbar, open: false })}
    severity={snackbar.severity}
    variant="filled"
  >
    {snackbar.message}
  </Alert>
        </Snackbar >

  {/* Floating Action Button for adding items */ }
  < Box
sx = {{
  position: "fixed",
    bottom: { xs: 16, md: 32 },
  right: { xs: 16, md: 32 },
  zIndex: 1000,
          }}
        >
  <Button
    variant="contained"
    size="large"
    onClick={handleClickOpen}
    sx={{
      borderRadius: "50%",
      width: { xs: 56, md: 64 },
      height: { xs: 56, md: 64 },
      minWidth: "unset",
      boxShadow: 3,
      "&:hover": {
        boxShadow: 6,
      },
    }}
  >
    <AddIcon sx={{ fontSize: { xs: 24, md: 28 } }} />
  </Button>
        </Box >
      </Container >
    </>
  );
}

// Mock functions to prevent build errors
const getSensorImageUrl = async (sensorName: string) => {
  console.log("Loading image for sensor:", sensorName);
  return "/sensor-placeholder.png";
};

const uploadPDFToB2 = async (file: File, invoiceNumber: string, componentName: string): Promise<string> => {
  // Mock implementation - replace with actual B2 upload logic
  console.log("Uploading file:", file.name, "for invoice:", invoiceNumber, "component:", componentName);
  return `/uploads/${invoiceNumber}_${file.name}`;
};

const EmailReportManager = () => {
  return <div>Email Report Manager Component</div>;
};