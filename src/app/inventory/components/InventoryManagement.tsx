"use client";
import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
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
  FormControlLabel,
  IconButton,
  MenuItem,
  Paper,
  Select,
  Snackbar,
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
import BuildIcon from "@mui/icons-material/Build";
import WarningIcon from "@mui/icons-material/Warning";
import InfoIcon from "@mui/icons-material/Info";
import DownloadIcon from "@mui/icons-material/Download";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import DeleteIcon from "@mui/icons-material/Delete";
import AssignmentIcon from "@mui/icons-material/Assignment";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import SearchIcon from "@mui/icons-material/Search";
import GroupIcon from "@mui/icons-material/Group";
import DescriptionIcon from "@mui/icons-material/Description";
import EmailReportManager from "./EmailReportManager";
import { getSensorImageUrl, uploadPDFToB2 } from "./aws";
import { createFolderAndSpreadsheetWithData } from "~/server/GAPI_ACTION/create_folder";
import {
  addComponentToInventory,
  addSensorToInventory,
  adjustComponentStockWithInvoice,
  adjustSensorStock,
  assignDeviceToOrder,
  deleteComponentFromInventory,
  deleteSensorFromInventory,
  getAllComponents,
  getAllOrders,
  getAllSensorsWithCustomers,
  // getAllOrders,
  getInvoiceFileDownloadUrl,
  getLowComponents,
  getProductionByFrequency,
  getProductionCapacitySummary,
  getProductionDevices,
  getProductionHierarchy,
  getSensorProductionCapacity,
  getSensors,
  releaseDeviceFromOrder,
  showAllComponents,
  showLogs,
  // showSensorInInventory,
  updateComponentSensorAssignments,
  updateComponentStock,
  updateSensorFrequency,
} from "src/app/inventory/components/backent";

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
  invoiceFile?: string; // File path/name for display
  invoiceFileKey?: string; // B2 storage key
  contactDetails: ContactDetails;
  price?: number; // Price per item
  lowStockThreshold?: number; // Threshold for low stock warning
  isCritical?: boolean; // Whether this component is critical for sensor assembly
  // Enhanced invoice information
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

// Novi tipi za hierarhični prikaz senzorjev iz ProductionList
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

// Dialog state management types
type DialogType = 'none' | 'edit' | 'delete' | 'adjustment' | 'deviceAction' | 'frequencyEdit';

interface DialogState {
  type: DialogType;
  item: InventoryItem | ProductionDevice | null;
  data: {
    adjustmentType?: 'increase' | 'decrease';
    adjustmentQuantity?: number;
    adjustmentReason?: string;
    deviceActionReason?: string;
    selectedOrderId?: number | null;
    showOrderSelection?: boolean;
    newFrequency?: string;
  };
}

type DialogAction =
  | { type: 'OPEN_EDIT'; item: InventoryItem }
  | { type: 'OPEN_DELETE'; item: InventoryItem }
  | { type: 'OPEN_ADJUSTMENT'; item: InventoryItem; adjustmentType: 'increase' | 'decrease' }
  | { type: 'OPEN_DEVICE_ACTION'; item: ProductionDevice }
  | { type: 'OPEN_FREQUENCY_EDIT'; item: ProductionDevice }
  | { type: 'UPDATE_EDIT_ITEM'; item: InventoryItem }
  | { type: 'UPDATE_ADJUSTMENT_DATA'; data: Partial<DialogState['data']> }
  | { type: 'UPDATE_DEVICE_ACTION_DATA'; data: Partial<DialogState['data']> }
  | { type: 'UPDATE_FREQUENCY_DATA'; data: Partial<DialogState['data']> }
  | { type: 'CLOSE' };

const initialDialogState: DialogState = {
  type: 'none',
  item: null,
  data: {}
};

function dialogReducer(state: DialogState, action: DialogAction): DialogState {
  switch (action.type) {
    case 'OPEN_EDIT':
      return {
        type: 'edit',
        item: action.item,
        data: {}
      };
    case 'OPEN_DELETE':
      return {
        type: 'delete',
        item: action.item,
        data: {}
      };
    case 'OPEN_ADJUSTMENT':
      return {
        type: 'adjustment',
        item: action.item,
        data: {
          adjustmentType: action.adjustmentType,
          adjustmentQuantity: 1,
          adjustmentReason: ''
        }
      };
    case 'OPEN_DEVICE_ACTION':
      return {
        type: 'deviceAction',
        item: action.item,
        data: {
          deviceActionReason: '',
          selectedOrderId: null,
          showOrderSelection: false
        }
      };
    case 'OPEN_FREQUENCY_EDIT':
      return {
        type: 'frequencyEdit',
        item: action.item,
        data: {
          newFrequency: (action.item as ProductionDevice).frequency || ''
        }
      };
    case 'UPDATE_EDIT_ITEM':
      return {
        ...state,
        item: action.item
      };
    case 'UPDATE_ADJUSTMENT_DATA':
    case 'UPDATE_DEVICE_ACTION_DATA':
    case 'UPDATE_FREQUENCY_DATA':
      return {
        ...state,
        data: { ...state.data, ...action.data }
      };
    case 'CLOSE':
      return initialDialogState;
    default:
      return state;
  }
}

// Search state management types
interface SearchState {
  componentSearchQuery: string;
  deviceSearchQuery: string;
}

type SearchAction =
  | { type: 'SET_COMPONENT_SEARCH'; query: string }
  | { type: 'SET_DEVICE_SEARCH'; query: string }
  | { type: 'CLEAR_COMPONENT_SEARCH' }
  | { type: 'CLEAR_DEVICE_SEARCH' }
  | { type: 'CLEAR_ALL_SEARCHES' };

const initialSearchState: SearchState = {
  componentSearchQuery: '',
  deviceSearchQuery: ''
};

function searchReducer(state: SearchState, action: SearchAction): SearchState {
  switch (action.type) {
    case 'SET_COMPONENT_SEARCH':
      return { ...state, componentSearchQuery: action.query };
    case 'SET_DEVICE_SEARCH':
      return { ...state, deviceSearchQuery: action.query };
    case 'CLEAR_COMPONENT_SEARCH':
      return { ...state, componentSearchQuery: '' };
    case 'CLEAR_DEVICE_SEARCH':
      return { ...state, deviceSearchQuery: '' };
    case 'CLEAR_ALL_SEARCHES':
      return initialSearchState;
    default:
      return state;
  }
}

// Invoice state management types
interface InvoiceState {
  file: File | null;
  number: string;
  uploading: boolean;
  isDragging: boolean;
  history: Array<{
    invoiceNumber: string;
    filename: string | null;
    uploadDate: Date;
    amount: number | null;
    downloadUrl: string | null;
  }>;
  loadingHistory: boolean;
}

type InvoiceAction =
  | { type: 'SET_FILE'; file: File | null }
  | { type: 'SET_NUMBER'; number: string }
  | { type: 'SET_UPLOADING'; uploading: boolean }
  | { type: 'SET_DRAGGING'; isDragging: boolean }
  | { type: 'SET_HISTORY'; history: InvoiceState['history'] }
  | { type: 'SET_LOADING_HISTORY'; loading: boolean }
  | { type: 'CLEAR_INVOICE' };

const initialInvoiceState: InvoiceState = {
  file: null,
  number: '',
  uploading: false,
  isDragging: false,
  history: [],
  loadingHistory: false
};

function invoiceReducer(state: InvoiceState, action: InvoiceAction): InvoiceState {
  switch (action.type) {
    case 'SET_FILE':
      return { ...state, file: action.file };
    case 'SET_NUMBER':
      return { ...state, number: action.number };
    case 'SET_UPLOADING':
      return { ...state, uploading: action.uploading };
    case 'SET_DRAGGING':
      return { ...state, isDragging: action.isDragging };
    case 'SET_HISTORY':
      return { ...state, history: action.history };
    case 'SET_LOADING_HISTORY':
      return { ...state, loadingHistory: action.loading };
    case 'CLEAR_INVOICE':
      return { ...initialInvoiceState };
    default:
      return state;
  }
}

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

// Component for handling sensor images with fallback
const SensorImage = ({ sensorName }: { sensorName: string }) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageUrl, setImageUrl] = useState<string>("");

  useEffect(() => {
    console.log("🖼️ SensorImage component mounted for sensor:", sensorName);
    let isMounted = true;
    const fetchImageUrl = async () => {
      try {
        console.log("📥 Fetching image URL for sensor:", sensorName);
        const url = await getSensorImageUrl(sensorName);
        console.log("📤 Received image URL:", url);

        if (isMounted) {
          setImageUrl(url);
          console.log("✅ Image URL set in state:", url);
        }
      } catch (error) {
        console.error("❌ Error fetching image URL:", error);
        if (isMounted) setImageUrl("");
      }
    };
    fetchImageUrl();
    return () => {
      isMounted = false;
      console.log("🧹 SensorImage component unmounted for sensor:", sensorName);
    };
  }, [sensorName]);

  const handleImageError = () => {
    console.error("🚨 Image failed to load:", {
      sensorName,
      imageUrl,
      message: "Check if the image exists at this URL",
    });
    setImageError(true);
  };

  const handleImageLoad = () => {
    console.log("🎉 Image loaded successfully:", {
      sensorName,
      imageUrl,
    });
    setImageLoaded(true);
  };

  // Debug current state
  console.log("🔍 SensorImage render state:", {
    sensorName,
    imageUrl,
    imageError,
    imageLoaded,
    hasUrl: !!imageUrl,
  });

  if (imageError || !imageUrl) {
    console.log("🔄 Showing fallback placeholder for:", sensorName, {
      imageError,
      hasUrl: !!imageUrl,
      reason: imageError ? "Image load failed" : "No URL generated",
    });
    // Fallback placeholder
    return (
      <Box
        sx={{
          width: "100%",
          aspectRatio: "1 / 1", // Square shape
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

  console.log("🖼️ Rendering actual image for:", sensorName, "URL:", imageUrl);
  return (
    <Box
      sx={{
        width: "100%",
        aspectRatio: "1 / 1", // Square shape
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
      <img
        src={imageUrl}
        alt={`${sensorName} sensor`}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain", // Show full image within square bounds
          display: imageLoaded ? "block" : "none",
          borderRadius: "4px",
        }}
        onError={handleImageError}
        onLoad={handleImageLoad}
      />
    </Box>
  );
};

export default function InventoryManagementPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [activeTab, setActiveTab] = useState(0);
  const [sensorInventory, setSensorInventory] = useState<SenzorStockItem[]>([]);
  const [componentInventory, setComponentInventory] = useState<
    ComponentStockItem[]
  >([]);

  // Consolidated state management using reducers
  const [dialogState, dispatchDialog] = useReducer(dialogReducer, initialDialogState);
  const [searchState, dispatchSearch] = useReducer(searchReducer, initialSearchState);
  const [invoiceState, dispatchInvoice] = useReducer(invoiceReducer, initialInvoiceState);

  // Keep some individual states that don't fit well into reducers
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error" | "info" | "warning",
  });
  const [sensorOptions, setSensorOptions] = useState<SensorOption[]>([]);

  // Derived state from reducers for easier access
  const isEditDialogOpen = dialogState.type === 'edit';
  const isDeleteDialogOpen = dialogState.type === 'delete';
  const isAdjustmentDialogOpen = dialogState.type === 'adjustment';
  const isDeviceActionDialogOpen = dialogState.type === 'deviceAction';
  const isFrequencyEditDialogOpen = dialogState.type === 'frequencyEdit';

  const editItem = dialogState.item as InventoryItem | null;
  const currentAdjustItem = dialogState.type === 'adjustment' ? dialogState.item as InventoryItem : null;
  const currentDevice = dialogState.type === 'deviceAction' ? dialogState.item as ProductionDevice : null;
  const editingFrequencyDevice = dialogState.type === 'frequencyEdit' ? dialogState.item as ProductionDevice : null;

  const adjustmentType = dialogState.data.adjustmentType || 'increase';
  const adjustmentQuantity = dialogState.data.adjustmentQuantity || 1;
  const adjustmentReason = dialogState.data.adjustmentReason || '';
  const deviceActionReason = dialogState.data.deviceActionReason || '';
  const selectedOrderId = dialogState.data.selectedOrderId || null;
  const showOrderSelection = dialogState.data.showOrderSelection || false;
  const newFrequency = dialogState.data.newFrequency || '';

  const componentSearchQuery = searchState.componentSearchQuery;
  const deviceSearchQuery = searchState.deviceSearchQuery;

  const invoiceFile = invoiceState.file;
  const invoiceNumber = invoiceState.number;
  const uploading = invoiceState.uploading;
  const isDragging = invoiceState.isDragging;
  const invoiceHistory = invoiceState.history;
  const loadingInvoiceHistory = invoiceState.loadingHistory;

  // Add query to fetch invoice files for a component
  const fetchComponentInvoiceHistory = useCallback(
    async (componentId: number) => {
      if (!componentId) return [];

      dispatchInvoice({ type: 'SET_LOADING_HISTORY', loading: true });
      try {
        // For now, return empty array since getComponentInvoiceFiles is not implemented
        const invoices: Array<{
          invoiceNumber: string;
          filename: string | null;
          uploadDate: Date;
          amount: number | null;
          downloadUrl: string | null;
        }> = [];
        // Sort by uploadDate descending to get newest first
        const sortedInvoices = invoices.sort(
          (a, b) =>
            new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime(),
        );
        dispatchInvoice({ type: 'SET_HISTORY', history: sortedInvoices });
        return sortedInvoices;
      } catch (error) {
        console.error("Failed to fetch invoice history:", error);
        dispatchInvoice({ type: 'SET_HISTORY', history: [] });
        return [];
      } finally {
        dispatchInvoice({ type: 'SET_LOADING_HISTORY', loading: false });
      }
    },
    [dispatchInvoice],
  );

  const queryClient = useQueryClient();

  // Helper function to check if component is below threshold

  // Helper function to determine alert type and severity
  function getComponentAlertInfo(component: ComponentStockItem) {
    const threshold = component.lowStockThreshold;
    const quantity = component.quantity ?? 0;
    let showAlert = false;
    let severity: "warning" | "error" = "warning";
    let color = "#FF9800"; // warning.main
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
  }

  // Helper function to check if component is in the low components list from database
  const isComponentInLowList = (component: ComponentStockItem) => {
    return LowComponents.some(
      (lowComp: LowComponentItem) =>
        lowComp.componentId === component.componentId,
    );
  };

  const initializeNewItem = useCallback(() => {
    if (activeTab === 0) {
      return {
        id: 0,
        senzorId: 0,
        sensorName: "",
        quantity: 1,
        location: "Main Warehouse",
        lastUpdated: new Date(),
        frequency: "868 MHz" as Frequency,
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
        lowStockThreshold: undefined, // No default threshold
        isCritical: false, // Default not critical
        contactDetails: {
          supplier: "",
          email: "",
          phone: "",
        },
      } as ComponentStockItem;
    }
  }, [activeTab]);

  // Add keyboard shortcut for search (Ctrl+F or Cmd+F)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        (event.ctrlKey || event.metaKey) &&
        event.key === "f" &&
        activeTab === 0
      ) {
        event.preventDefault();
        // Focus the search input
        const searchInput = document.querySelector(
          '[placeholder*="Search by Device EUI"]',
        ) as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      }
      // Escape to clear search
      if (event.key === "Escape" && deviceSearchQuery && activeTab === 0) {
        dispatchSearch({ type: 'CLEAR_DEVICE_SEARCH' });
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [activeTab, deviceSearchQuery, dispatchSearch]);

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
        message: `Račun je bil uspešno naložen v: ${filePath}`,
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

  const { data: allSensors = [] } = useQuery({
    queryKey: ["sensors"],
    queryFn: getSensors,
    enabled: activeTab === 0 || activeTab === 1, // Fetch when on sensors tab or components tab (needed for sensor assignments)
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: allComponents = [] } = useQuery({
    queryKey: ["components-inventory"],
    queryFn: showAllComponents,
    enabled: activeTab === 1, // Only fetch when on components tab
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: componentOptions = [] } = useQuery({
    queryKey: ["all-components"],
    queryFn: getAllComponents,
    enabled: activeTab === 1, // Only fetch when on components tab
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
  const { data: LowComponents = [] } = useQuery({
    queryKey: [" LowComponents "],
    queryFn: getLowComponents,
    enabled: activeTab === 1, // Only fetch when on components tab
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: logs = [] } = useQuery({
    queryKey: ["inventory-logs"],
    queryFn: showLogs,
    enabled: activeTab === 2, // Only fetch when on logs tab
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // // Query to fetch all orders for device assignment
  const { data: allOrders = [] } = useQuery({
    queryKey: ["orders"],
    queryFn: getAllOrders,
    enabled: activeTab === 0, // Only fetch when on sensors tab (needed for device assignment)
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
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
    enabled: activeTab === 0,
    staleTime: 15 * 60 * 1000, // 15 minutes cache
    gcTime: 60 * 60 * 1000, // 1 hour garbage collection
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnMount: false, // Don't refetch on every mount
  });

  // Use React Query for production capacity data
  const { data: productionCapacity = [] } = useQuery({
    queryKey: ["production-capacity"],
    queryFn: getSensorProductionCapacity,
    enabled: activeTab === 0 || activeTab === 1, // Fetch when on sensors or components tab
    staleTime: 10 * 60 * 1000, // 10 minutes cache
    refetchOnWindowFocus: false,
  });

  const { data: capacitySummary } = useQuery({
    queryKey: ["capacity-summary"],
    queryFn: getProductionCapacitySummary,
    enabled: activeTab === 0 || activeTab === 1, // Fetch when on sensors or components tab
    staleTime: 10 * 60 * 1000, // 10 minutes cache
    refetchOnWindowFocus: false,
  });

  // Query for sensors with customers - for the "All Sensors" tab
  const { data: sensorsWithCustomers } = useQuery({
    queryKey: ["sensors-with-customers"],
    queryFn: getAllSensorsWithCustomers,
    enabled: activeTab === 4, // Fetch when on "All Sensors" tab
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    refetchOnWindowFocus: false,
  });

  // ===================== MEMOIZED COMPUTATIONS =====================

  // Memoize filtered components computation for better performance
  const filteredComponents = useMemo(() => {
    if (!componentSearchQuery.trim()) return allComponents;

    const searchLower = componentSearchQuery.toLowerCase();
    return allComponents.filter((component) =>
      component.name?.toLowerCase().includes(searchLower) ||
      component.contactDetails?.supplier?.toLowerCase().includes(searchLower) ||
      component.contactDetails?.email?.toLowerCase().includes(searchLower) ||
      component.invoiceNumber?.toLowerCase().includes(searchLower)
    );
  }, [allComponents, componentSearchQuery]);

  // Memoize filtered device hierarchy computation for better performance
  const filteredDeviceHierarchy = useMemo(() => {
    if (!deviceSearchQuery.trim()) return productionHierarchy;

    const searchLower = deviceSearchQuery.toLowerCase();
    return productionHierarchy
      .map((sensorGroup) => ({
        ...sensorGroup,
        frequencies: sensorGroup.frequencies
          .map((freqGroup) => ({
            ...freqGroup,
            devices: freqGroup.devices.filter((device) =>
              device.devEUI?.toLowerCase().includes(searchLower) ||
              device.appEUI?.toLowerCase().includes(searchLower)
            ),
          }))
          .filter((freqGroup) => freqGroup.devices.length > 0),
      }))
      .filter((sensorGroup) => sensorGroup.frequencies.length > 0);
  }, [productionHierarchy, deviceSearchQuery]);

  // Memoize frequency options for form dropdown
  const frequencyOptions: Frequency[] = useMemo(() => [
    "AS923",
    "EU868",
    "US915",
    "2.4 GHz"
  ], []);

  // ===================== END MEMOIZED COMPUTATIONS =====================

  useEffect(() => {
    if (isEditDialogOpen && activeTab === 1) {
      const componentItem = editItem as ComponentStockItem;
      const options = allSensors
        .filter((sensor) => typeof sensor.id === "number")
        .map((sensor) => {
          const existingAssignment = componentItem?.sensorAssignments?.find(
            (a) => a.sensorId === sensor.id,
          );

          return {
            id: sensor.id as number,
            name: sensor.sensorName,
            selected: !!existingAssignment,
            requiredQuantity: existingAssignment?.requiredQuantity || 1,
          };
        });

      setSensorOptions(options);
      dispatchInvoice({ type: 'SET_NUMBER', number: componentItem.invoiceNumber || '' });
    }
  }, [isEditDialogOpen, editItem, activeTab, allSensors, dispatchInvoice]);



  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleClickOpen = () => {
    const newItem = initializeNewItem();
    dispatchDialog({ type: 'OPEN_EDIT', item: newItem });
  };

  const handleClose = () => {
    dispatchDialog({ type: 'CLOSE' });
    setSensorOptions([]);
    dispatchInvoice({ type: 'CLEAR_INVOICE' });
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

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    dispatchInvoice({ type: 'SET_DRAGGING', isDragging: true });
  };

  const handleDragLeave = () => {
    dispatchInvoice({ type: 'SET_DRAGGING', isDragging: false });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    dispatchInvoice({ type: 'SET_DRAGGING', isDragging: false });

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      dispatchInvoice({ type: 'SET_FILE', file });

      // Set filename (without extension) as invoice number
      const fileNameWithoutExtension = file.name.replace(/\.[^/.]+$/, "");
      dispatchInvoice({ type: 'SET_NUMBER', number: fileNameWithoutExtension });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      dispatchInvoice({ type: 'SET_FILE', file });

      // Set filename (without extension) as invoice number
      const fileNameWithoutExtension = file.name.replace(/\.[^/.]+$/, "");
      dispatchInvoice({ type: 'SET_NUMBER', number: fileNameWithoutExtension });

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
    dispatchInvoice({ type: 'SET_NUMBER', number: value });

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
      const sensor =
        Array.isArray(result) && result.length > 0 ? result[0] : result;

      return {
        id: sensor.id,
        senzorId: sensor.senzorId ?? sensor.sensorId,
        sensorId: sensor.sensorId,
        sensorName: sensor.sensorName,
        quantity: sensor.quantity,
        location: sensor.location,
        lastUpdated: sensor.lastUpdated
          ? new Date(sensor.lastUpdated)
          : new Date(),
        frequency: sensor.frequency
          ? (sensor.frequency as Frequency)
          : undefined,
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
      const senzorId = newSensor.senzorId ?? newSensor.sensorId ?? 0;
      const sensorName =
        newSensor.sensorName ??
        allSensors.find((s) => s.id === senzorId)?.sensorName ??
        "";
      setSensorInventory((prev) => [
        ...prev,
        {
          id: newSensor.id,
          senzorId,
          sensorName,
          quantity: newSensor.quantity,
          location: newSensor.location,
          lastUpdated: newSensor.lastUpdated
            ? new Date(newSensor.lastUpdated)
            : new Date(),
          frequency: newSensor.frequency ?? undefined,
          dev_eui:
            newSensor.dev_eui ?? newSensor.productionListDevEUI ?? undefined,
        } as SenzorStockItem,
      ]);
      queryClient.invalidateQueries({ queryKey: ["sensors-inventory"] });
    },
    onError: (error: unknown) => {
      setSnackbar({
        open: true,
        message: (error as Error)?.message || "Dodajanje senzorja ni uspelo",
        severity: "error",
      });
    },
  });

  const handleAddOrUpdateSensor = async () => {
    if (!editItem) return;

    try {
      if ("senzorId" in editItem) {
        if (!editItem.senzorId || !editItem.location || !editItem.frequency) {
          const missingFields = [];
          if (!editItem.senzorId) missingFields.push("sensor");
          if (!editItem.location) missingFields.push("location");
          if (!editItem.frequency) missingFields.push("frequency");

          setSnackbar({
            open: true,
            message: `Please fill in required fields: ${missingFields.join(", ")}`,
            severity: "error",
          });
          return;
        }

        if (editItem.id) {
          setSensorInventory(
            sensorInventory.map((item) =>
              item.id === editItem.id
                ? { ...(editItem as SenzorStockItem), lastUpdated: new Date() }
                : item,
            ),
          );
        } else {
          const { senzorId, quantity, location, frequency, dev_eui } =
            editItem as SenzorStockItem;

          const newSensor = await addNewSensor.mutateAsync({
            sensorId: senzorId,
            quantity: quantity || 1,
            location,
            frequency: frequency as Frequency,
            dev_eui,
          });

          setSensorInventory((prev) => [
            ...prev,
            {
              id: newSensor.id,
              senzorId: (newSensor.senzorId ?? newSensor.sensorId) as number,
              sensorName:
                (newSensor as { sensorName?: string }).sensorName ??
                allSensors.find(
                  (s) => s.id === (newSensor.senzorId ?? newSensor.sensorId),
                )?.sensorName ??
                "",
              quantity: newSensor.quantity,
              location: newSensor.location,
              lastUpdated: newSensor.lastUpdated
                ? new Date(newSensor.lastUpdated)
                : new Date(),
              frequency: (newSensor.frequency as Frequency) ?? undefined,
              dev_eui:
                (
                  newSensor as {
                    dev_eui?: string;
                    productionListDevEUI?: string;
                  }
                ).dev_eui ??
                (
                  newSensor as {
                    dev_eui?: string;
                    productionListDevEUI?: string;
                  }
                ).productionListDevEUI ??
                undefined,
            } as SenzorStockItem,
          ]);
        }
      } else {
        const updatedItem = {
          ...editItem,
          invoiceNumber: invoiceNumber || undefined,
          sensorAssignments: sensorOptions
            .filter((option) => option.selected)
            .map((option) => ({
              sensorId: option.id,
              sensorName: option.name,
              requiredQuantity: option.requiredQuantity,
            })),
        } as ComponentStockItem;

        if (editItem.id) {
          setComponentInventory(
            componentInventory.map((item) =>
              item.id === editItem.id
                ? { ...updatedItem, lastUpdated: new Date() }
                : item,
            ),
          );
        } else {
          setComponentInventory([
            ...componentInventory,
            {
              ...updatedItem,
              id: Date.now(),
              lastUpdated: new Date(),
            },
          ]);
        }

        if (invoiceFile) {
          console.log("Uploading invoice:", invoiceFile.name);
        }
      }

      setSnackbar({
        open: true,
        message: `Artikel ${editItem.id ? "posodobljen" : "dodan"} uspešno!`,
        severity: "success",
      });
      handleClose();
    } catch (error) {
      console.error("Error saving item:", error);
      setSnackbar({
        open: true,
        message: "Shranjevanje artikla ni uspelo: " + (error as Error).message,
        severity: "error",
      });
    }
  };

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
      // Če je dialog še odprt, ponovno nastavi editItem iz svežih podatkov
      if (isEditDialogOpen && editItem && "componentId" in editItem) {
        const freshComponent = allComponents.find((c) => c.id === editItem.id);
        dispatchDialog({ type: 'OPEN_EDIT', item: freshComponent ?? editItem });
      }
    },
    onError: (error: unknown) => {
      setSnackbar({
        open: true,
        message:
          (error as Error)?.message || "Prilagoditev zaloge komponente ni uspela",
        severity: "error",
      });
    },
  });

  const handleAddOrUpdateComponent = async () => {
    if (!editItem) return;

    const missingFields = [];
    if (!("componentId" in editItem)) missingFields.push("Component");
    if ("name" in editItem && !editItem.name)
      missingFields.push("Component Name");

    const currentComponent = allComponents.find((c) => c.id === editItem.id);
    const currentQuantity = currentComponent?.quantity ?? 0;
    const newQuantity = editItem.quantity ?? 0;

    if (newQuantity > currentQuantity && !invoiceNumber) {
      missingFields.push("Invoice Number");
    }

    if (missingFields.length > 0) {
      setSnackbar({
        open: true,
        message: `Please fill in required fields: ${missingFields.join(", ")}`,
        severity: "error",
      });
      return;
    }

    const updatedItem: ComponentStockItem = {
      id: editItem.id ?? Date.now(),
      componentId: (editItem as ComponentStockItem).componentId ?? 0,
      name: (editItem as ComponentStockItem).name ?? "",
      quantity: newQuantity,
      location: editItem.location ?? "",
      lastUpdated: new Date(),
      sensorAssignments: sensorOptions
        .filter((option) => option.selected)
        .map((option) => ({
          sensorId: option.id,
          sensorName: option.name,
          requiredQuantity: option.requiredQuantity,
        })),
      invoiceNumber: invoiceNumber,
      price: (editItem as ComponentStockItem).price ?? 0,
      lowStockThreshold:
        (editItem as ComponentStockItem).lowStockThreshold ?? undefined,
      isCritical: (editItem as ComponentStockItem).isCritical ?? false,
      contactDetails: (editItem as ComponentStockItem).contactDetails ?? {
        supplier: "",
        email: "",
        phone: "",
      },
    };

    try {
      // Upload file if provided
      let fileKey: string | null = null;
      if (invoiceFile) {
        dispatchInvoice({ type: 'SET_UPLOADING', uploading: true });
        try {
          fileKey = await uploadMutation.mutateAsync({
            file: invoiceFile,
            componentName: updatedItem.name,
          });
        } catch (error) {
          dispatchInvoice({ type: 'SET_UPLOADING', uploading: false });
          throw new Error(`File upload failed: ${(error as Error).message}`);
        }
        dispatchInvoice({ type: 'SET_UPLOADING', uploading: false });
      }

      if (editItem.id) {
        await updateComponentStock(
          editItem.id,
          updatedItem.quantity,
          "Manual update",
          invoiceNumber || undefined, // Always pass invoice number if provided
          updatedItem.location,
          updatedItem.contactDetails.email,
          updatedItem.contactDetails.supplier,
          updatedItem.contactDetails.phone,
          updatedItem.price,
          fileKey || undefined, // Pass file key to backend
        );

        await updateComponentSensorAssignments(
          updatedItem.componentId,
          updatedItem.sensorAssignments,
        );

        queryClient.invalidateQueries({ queryKey: ["components-inventory"] });

        setSnackbar({
          open: true,
          message: "Komponenta uspešno posodobljena!",
          severity: "success",
        });
      } else {
        await addComponentToInventory(
          updatedItem.componentId,
          updatedItem.quantity,
          updatedItem.location,
          updatedItem.contactDetails.email,
          updatedItem.contactDetails.supplier,
          updatedItem.invoiceNumber,
          updatedItem.price,
          updatedItem.contactDetails.phone,
          updatedItem.sensorAssignments,
          fileKey || undefined,
        );

        queryClient.invalidateQueries({ queryKey: ["components-inventory"] });

        setSnackbar({
          open: true,
          message: "Komponenta uspešno dodana!",
          severity: "success",
        });
      }

      handleClose();
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Operation failed: " + (error as Error).message,
        severity: "error",
      });
    }
  };

  // ...obstoječa koda...
  const handleDeleteItem = async () => {
    if (!editItem) return;
    try {
      if ("senzorId" in editItem) {
        await deleteSensorFromInventory((editItem as SenzorStockItem).dev_eui!);
      } else {
        await deleteComponentFromInventory(editItem.id!);
      }
      setSnackbar({
        open: true,
        message: "Artikel uspešno izbrisan!",
        severity: "success",
      });
      dispatchDialog({ type: 'CLOSE' });
      handleClose();
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Brisanje artikla ni uspelo: " + (error as Error).message,
        severity: "error",
      });
    }
  };
  // ...obstoječa koda...
  const adjustSensorStockMutation = useMutation({
    mutationFn: async ({
      stockId,

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
    },
    onError: (error: unknown) => {
      setSnackbar({
        open: true,
        message: (error as Error)?.message || "Prilagoditev zaloge senzorja ni uspela",
        severity: "error",
      });
    },
  });

  const openAdjustmentDialog = (
    item: InventoryItem,
    type: "increase" | "decrease",
  ) => {
    dispatchDialog({ type: 'OPEN_ADJUSTMENT', item, adjustmentType: type });
  };

  const confirmAdjustment = async () => {
    if (!currentAdjustItem || !adjustmentReason) return;

    const change =
      adjustmentType === "increase" ? adjustmentQuantity : -adjustmentQuantity;

    try {
      // Upload file if provided and it's a component increase
      let fileKey: string | null = null;
      if (
        invoiceFile &&
        adjustmentType === "increase" &&
        "componentId" in currentAdjustItem
      ) {
        dispatchInvoice({ type: 'SET_UPLOADING', uploading: true });
        try {
          fileKey = await uploadMutation.mutateAsync({
            file: invoiceFile,
            componentName: (currentAdjustItem as ComponentStockItem).name,
          });
        } catch (error) {
          dispatchInvoice({ type: 'SET_UPLOADING', uploading: false });
          throw new Error(`File upload failed: ${(error as Error).message}`);
        }
        dispatchInvoice({ type: 'SET_UPLOADING', uploading: false });
      }

      if ("senzorId" in currentAdjustItem) {
        await adjustSensorStockMutation.mutateAsync({
          stockId: String(currentAdjustItem.id!),
          quantity: change,
          reason: adjustmentReason,
        });
      } else {
        await adjustComponentStockMutation.mutateAsync({
          stockId: currentAdjustItem.id!,
          quantity: change,
          reason: adjustmentReason,
          invoiceNumber:
            adjustmentType === "increase"
              ? invoiceNumber
              : (currentAdjustItem as ComponentStockItem).invoiceNumber,
          fileKey: fileKey || undefined,
          price: undefined, // Could be added to UI later
          supplier: undefined, // Could be added to UI later
        });
      }

      dispatchDialog({ type: 'CLOSE' });
      // Clear file state after successful adjustment
      dispatchInvoice({ type: 'CLEAR_INVOICE' });
    } catch (error) {
      console.error("Adjustment failed:", error);
      setSnackbar({
        open: true,
        message: "Adjustment failed: " + (error as Error).message,
        severity: "error",
      });
    }
  };
  const handleEditItem = async (item: InventoryItem) => {
    // For components, force a fresh fetch to get the latest data including invoice info
    if ("componentId" in item) {
      try {
        // Force refetch the latest component data
        await queryClient.invalidateQueries({
          queryKey: ["components-inventory"],
        });
        const freshData = await showAllComponents(); // Direct call to get fresh data
        const freshComponent = freshData.find(
          (c: ComponentStockItem) => c.id === item.id,
        );

        dispatchDialog({ type: 'OPEN_EDIT', item: freshComponent ?? item });

        // Fetch invoice history for this component
        try {
          const history = await fetchComponentInvoiceHistory(item.componentId);
          dispatchInvoice({ type: 'SET_HISTORY', history });
        } catch (error) {
          console.error("Failed to fetch invoice history:", error);
          dispatchInvoice({ type: 'SET_HISTORY', history: [] });
        }
      } catch (error) {
        console.error("Failed to fetch fresh component data:", error);
        // Fallback to existing data
        dispatchDialog({ type: 'OPEN_EDIT', item });
        dispatchInvoice({ type: 'SET_HISTORY', history: [] });
      }
    } else {
      dispatchDialog({ type: 'OPEN_EDIT', item });
      dispatchInvoice({ type: 'SET_HISTORY', history: [] }); // Clear invoice history for sensors
    }
  };

  // Funkcije za upravljanje hierarhičnega prikaza
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
      const { downloadUrl } = await getInvoiceFileDownloadUrl(invoiceNumber);

      // Create a temporary anchor element to trigger download
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = filename;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setSnackbar({
        open: true,
        message: "Prenos uspešno začet!",
        severity: "success",
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Download failed: " + (error as Error).message,
        severity: "error",
      });
    }
  };

  // Add report generation functions

  // Device action functions
  const handleRemoveDevice = async (device: ProductionDevice) => {
    try {
      await deleteSensorFromInventory(device.devEUI);
      // Refresh the production hierarchy data
      queryClient.invalidateQueries({ queryKey: ["production-hierarchy"] });
      setSnackbar({
        open: true,
        message: `Naprava ${device.devEUI} uspešno odstranjena!`,
        severity: "success",
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Odstranitev naprave ni uspela: " + (error as Error).message,
        severity: "error",
      });
    }
  };

  const handleAssignToOrder = async (
    device: ProductionDevice,
    orderId: number,
    //reason: string,
  ) => {
    try {
      await assignDeviceToOrder(device.devEUI, orderId);
      // Refresh the production hierarchy data
      queryClient.invalidateQueries({ queryKey: ["production-hierarchy"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      setSnackbar({
        open: true,
        message: `Naprava ${device.devEUI} uspešno dodeljena naročilu!`,
        severity: "success",
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Dodelitev naprave ni uspela: " + (error as Error).message,
        severity: "error",
      });
    }
  };

  const handleReleaseFromOrder = async (
    device: ProductionDevice,
    reason: string,
  ) => {
    try {
      await releaseDeviceFromOrder(device.devEUI, reason);
      // Refresh the production hierarchy data
      queryClient.invalidateQueries({ queryKey: ["production-hierarchy"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      setSnackbar({
        open: true,
        message: `Naprava ${device.devEUI} uspešno sproščena iz naročila!`,
        severity: "success",
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Sprostitev naprave ni uspela: " + (error as Error).message,
        severity: "error",
      });
    }
  };

  const openDeviceActionDialog = (device: ProductionDevice) => {
    dispatchDialog({ type: 'OPEN_DEVICE_ACTION', item: device });
  };

  const confirmDeviceAction = async (
    action: "remove" | "assign" | "release",
  ) => {
    if (!currentDevice) return;

    if (action === "remove") {
      await handleRemoveDevice(currentDevice);
    } else if (action === "assign" && selectedOrderId) {
      await handleAssignToOrder(
        currentDevice,
        selectedOrderId,
        //deviceActionReason || "Assigned to order",
      );
    } else if (action === "release") {
      await handleReleaseFromOrder(
        currentDevice,
        deviceActionReason || "Released from order",
      );
    }

    dispatchDialog({ type: 'CLOSE' });
  };

  const openFrequencyEditDialog = (device: ProductionDevice) => {
    dispatchDialog({ type: 'OPEN_FREQUENCY_EDIT', item: device });
  };

  const handleUpdateFrequency = async () => {
    if (!editingFrequencyDevice || !newFrequency) return;

    try {
      await updateSensorFrequency(editingFrequencyDevice.devEUI, newFrequency);

      // Refetch the production devices
      queryClient.invalidateQueries({ queryKey: ["productionDevices"] });

      setSnackbar({
        open: true,
        message: `Frekvenca uspešno posodobljena za napravo ${editingFrequencyDevice.devEUI}!`,
        severity: "success",
      });

      dispatchDialog({ type: 'CLOSE' });
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Posodabljanje frekvence ni uspelo: " + (error as Error).message,
        severity: "error",
      });
    }
  };

  return (
    <>
      {/* Add CSS for pulse animation */}
      <style>
        {`
          @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
          }
          
          @keyframes pulseFast {
            0% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.3; transform: scale(1.1); }
            100% { opacity: 1; transform: scale(1); }
          }
          
          .pulse-normal {
            animation: pulse 2s infinite;
          }
          
          .pulse-fast {
            animation: pulseFast 1s infinite;
          }
          
          .glow-critical {
            filter: drop-shadow(0 0 8px rgba(220, 38, 38, 0.8)) drop-shadow(0 0 16px rgba(220, 38, 38, 0.4));
          }
          
          .glow-warning {
            filter: drop-shadow(0 0 4px rgba(255, 152, 0, 0.8));
          }
        `}
      </style>
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
        // className="mx-auto max-w-7xl"
        >
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
                  Upravljanje zaloge
                </Typography>
                {!isMobile && (
                  <Typography variant="body2" color="text.secondary">
                    Upravljajte zalogo naprav in komponent
                  </Typography>
                )}
              </Box>
            </Box>

            {/* Low Stock Alert Summary
            {LowComponents.length > 0 && (
              <Box sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                p: 2,
                borderRadius: 2,
                bgcolor: 'error.light',
                border: 2,
                borderColor: 'error.main',
                order: { xs: -1, md: 1 }
              }}
              >
                <WarningIcon
                  sx={{
                    color: 'error.main',
                    fontSize: 24
                  }}
                  className="glow-critical pulse-fast"
                />
                <Box>
                  <Typography variant="body2" fontWeight={600} color="error.main">
                    CRITICAL STOCK ALERT
                  </Typography>
                  <Typography variant="caption" color="error.dark">
                    {LowComponents.length} component{LowComponents.length > 1 ? 's' : ''} critically low
                  </Typography>
                </Box>
              </Box>
            )} */}
          </Box>

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
            <Tab label="Naprave" />
            <Tab label="Komponente" />
            <Tab
              label={isMobile ? "Dnevniki" : "Dnevniki aktivnosti"}
              icon={<HistoryIcon />}
              iconPosition="start"
            />
            <Tab
              label={isMobile ? "Poročila" : "E-poštna poročila"}
              icon={<EmailIcon />}
              iconPosition="start"
            />
            <Tab
              label={isMobile ? "Vsi senzorji" : "Vsi senzorji z uporabniki"}
              icon={<GroupIcon />}
              iconPosition="start"
            />
          </Tabs>

          {activeTab === 2 ? (
            // Logs tab
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
                                    Časovni žig
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
                                    Razlog
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
                                      Uporabnik
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
                                      Številka računa
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
                        Ni razpoložljivih dnevnikov
                      </Typography>
                      <Typography
                        color="text.secondary"
                        variant="body2"
                        sx={{ mt: 1 }}
                      >
                        Dnevniki aktivnosti se bodo prikazali tukaj, ko boste naredili spremembe
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
                          <TableCell>Časovni žig</TableCell>
                          <TableCell>Artikel</TableCell>
                          <TableCell>Tip</TableCell>
                          <TableCell>Sprememba</TableCell>
                          <TableCell>Razlog</TableCell>
                          <TableCell>Uporabnik</TableCell>
                          <TableCell>Račun</TableCell>
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
                              Ni razpoložljivih dnevnikov
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              )}
            </>
          ) : activeTab === 3 ? (
            // Email Reports tab
            <EmailReportManager />
          ) : activeTab === 4 ? (
            // All Sensors with Customers tab
            <>
              {/* Quick Navigation to Orders */}
              <Box sx={{ mb: 3, display: "flex", justifyContent: "flex-end" }}>
                <Button
                  variant="outlined"
                  color="primary"
                  startIcon={<ShoppingCartIcon />}
                  onClick={() => {
                    // Navigate to orders page
                    window.location.href = "/orders";
                  }}
                  sx={{ mr: 2 }}
                >
                  Pojdi na naročila
                </Button>
              </Box>

              {/* Sensors grouped by orders */}
              {sensorsWithCustomers ? (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  {/* Show orders with assigned devices first */}
                  {sensorsWithCustomers.ordersWithDevices.map((order) => (
                    <Card
                      key={order.orderId}
                      elevation={3}
                      sx={{
                        borderRadius: 2,
                        border: "1px solid",
                        borderColor: "divider",
                      }}
                    >
                      {/* Order Header */}
                      <Box
                        sx={{
                          p: { xs: 2, md: 3 },
                          bgcolor: "primary.light",
                          color: "white",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          flexWrap: "wrap",
                          gap: 2,
                        }}
                      >
                        <Box>
                          <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            {order.orderName || `Order #${order.orderId}`}
                          </Typography>
                          <Typography variant="body2" sx={{ opacity: 0.9 }}>
                            Kupec: {order.customerName}
                          </Typography>
                          {order.assemblier && (
                            <Typography variant="body2" sx={{ opacity: 0.9 }}>
                              Sestavljavec: {order.assemblier}
                            </Typography>
                          )}
                        </Box>
                        <Box sx={{ textAlign: "right" }}>
                          <Chip
                            label={`${order.deviceCount} device${order.deviceCount !== 1 ? 's' : ''}`}
                            color="secondary"
                            variant="filled"
                            sx={{ mb: 1 }}
                          />
                          <Typography variant="caption" sx={{ display: "block" }}>
                            Status: {order.status}
                          </Typography>
                          <Typography variant="caption" sx={{ display: "block" }}>
                            Date: {new Date(order.orderDate).toLocaleDateString()}
                          </Typography>
                        </Box>
                      </Box>

                      {/* Devices in this order */}
                      <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                        {order.devices.length > 0 ? (
                          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                            {order.devices.map((device) => (
                              <Box
                                key={device.id}
                                sx={{
                                  p: 2,
                                  bgcolor: "grey.50",
                                  borderRadius: 1,
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  flexWrap: "wrap",
                                  gap: 1,
                                }}
                              >
                                <Box>
                                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                    {device.deviceType}
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary">
                                    DevEUI: {device.devEUI}
                                  </Typography>
                                </Box>
                                <Chip
                                  label={device.frequency}
                                  size="small"
                                  color="primary"
                                  variant="outlined"
                                />
                              </Box>
                            ))}
                          </Box>
                        ) : (
                          <Typography color="text.secondary" sx={{ textAlign: "center", py: 2 }}>
                            Temu naročilu še ni dodeljenih naprav
                          </Typography>
                        )}

                        {/* Create Drive Documents Button */}
                        <Box sx={{ mt: 3, display: "flex", justifyContent: "flex-end" }}>
                          <Button
                            variant="contained"
                            color="secondary"
                            startIcon={<DescriptionIcon />}
                            onClick={async () => {
                              try {
                                await createFolderAndSpreadsheetWithData(
                                  order.customerName,
                                  order.orderId.toString(),
                                  order.devices
                                );
                                // You can add a success notification here
                                console.log('Drive documents created successfully for order:', order.orderId);
                              } catch (error) {
                                console.error('Error creating drive documents:', error);
                                // You can add an error notification here
                              }
                            }}
                          >
                            Ustvari Drive dokumente
                          </Button>
                        </Box>
                      </CardContent>
                    </Card>
                  ))}

                  {/* Show unassigned devices */}
                  {sensorsWithCustomers.unassignedDevices.deviceCount > 0 && (
                    <Card
                      elevation={3}
                      sx={{
                        borderRadius: 2,
                        border: "1px solid",
                        borderColor: "warning.main",
                      }}
                    >
                      <Box
                        sx={{
                          p: { xs: 2, md: 3 },
                          bgcolor: "warning.light",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          flexWrap: "wrap",
                          gap: 2,
                        }}
                      >
                        <Box>
                          <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            Razpoložljiva zaloga
                          </Typography>
                          <Typography variant="body2" sx={{ opacity: 0.8 }}>
                            Naprave, ki niso dodeljene nobenemu naročilu
                          </Typography>
                        </Box>
                        <Chip
                          label={`${sensorsWithCustomers.unassignedDevices.deviceCount} device${sensorsWithCustomers.unassignedDevices.deviceCount !== 1 ? 's' : ''}`}
                          color="warning"
                          variant="filled"
                        />
                      </Box>

                      <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                          {sensorsWithCustomers.unassignedDevices.devices.map((device) => (
                            <Box
                              key={device.id}
                              sx={{
                                p: 2,
                                bgcolor: "grey.50",
                                borderRadius: 1,
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                flexWrap: "wrap",
                                gap: 1,
                              }}
                            >
                              <Box>
                                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                  {device.deviceType}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  DevEUI: {device.devEUI}
                                </Typography>
                              </Box>
                              <Chip
                                label={device.frequency}
                                size="small"
                                color="primary"
                                variant="outlined"
                              />
                            </Box>
                          ))}
                        </Box>

                        {/* Create Inventory Documents Button */}
                        <Box sx={{ mt: 3, display: "flex", justifyContent: "flex-end" }}>
                          <Button
                            variant="contained"
                            color="success"
                            startIcon={<DescriptionIcon />}
                            onClick={async () => {
                              try {
                                await createFolderAndSpreadsheetWithData(
                                  null,
                                  null,
                                  sensorsWithCustomers.unassignedDevices.devices
                                );
                                console.log('Inventory drive documents created successfully');
                              } catch (error) {
                                console.error('Error creating inventory drive documents:', error);
                              }
                            }}
                          >
                            Ustvari dokumente zaloge
                          </Button>
                        </Box>
                      </CardContent>
                    </Card>
                  )}
                </Box>
              ) : (
                <Card elevation={2} sx={{ p: 6, textAlign: "center" }}>
                  <Typography color="text.secondary" variant="h6">
                    Podatki o senzorjih niso na voljo
                  </Typography>
                  <Typography color="text.secondary" variant="body2" sx={{ mt: 1 }}>
                    Nalaganje informacij o senzorjih in naročilih...
                  </Typography>
                </Card>
              )}
            </>
          ) : activeTab === 0 ? (
            // Sensors tab
            <>
              {/* Device Inventory - Hierarchical View */}
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
                    Zaloga naprav - Hierarhični pregled
                  </Typography>

                  {/* Device Search Field */}
                  <Box sx={{ mb: 3 }}>
                    <Tooltip
                      title="Press Ctrl+F to focus search, Esc to clear"
                      placement="top"
                    >
                      <TextField
                        value={searchState.deviceSearchQuery}
                        onChange={(e) => dispatchSearch({ type: 'SET_DEVICE_SEARCH', query: e.target.value })}
                        placeholder="Išči po Device EUI ali App EUI..."
                        fullWidth
                        size="small"
                        InputProps={{
                          startAdornment: (
                            <SearchIcon
                              sx={{ mr: 1, color: "text.secondary" }}
                            />
                          ),
                          endAdornment: searchState.deviceSearchQuery && (
                            <IconButton
                              size="small"
                              onClick={() => dispatchSearch({ type: 'SET_DEVICE_SEARCH', query: '' })}
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
                            ? ` - najdenih ${totalFilteredDevices} naprav${totalFilteredDevices !== 1 ? "" : "a"}`
                            : "";
                        })()}
                      </Typography>
                    )}
                  </Box>

                  {(() => {
                    // Use memoized filtered hierarchy
                    const filteredHierarchy = filteredDeviceHierarchy;

                    // Show appropriate empty state
                    if (productionHierarchy.length === 0) {
                      return (
                        <Card elevation={2} sx={{ p: 6, textAlign: "center" }}>
                          <Typography color="text.secondary" variant="h6">
                            Ni naprav v zalogi
                          </Typography>
                          <Typography
                            color="text.secondary"
                            variant="body2"
                            sx={{ mt: 1 }}
                          >
                            Dodajte naprave, da jih boste videli organizirane po tipu in
                            frekvenci
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
                            Ni najdenih naprav
                          </Typography>
                          <Typography
                            color="text.secondary"
                            variant="body2"
                            sx={{ mt: 1 }}
                          >
                            Nobena naprava se ne ujema z &ldquo;{searchState.deviceSearchQuery}&rdquo;
                          </Typography>
                          <Button
                            variant="outlined"
                            onClick={() => dispatchSearch({ type: 'SET_DEVICE_SEARCH', query: '' })}
                            sx={{ mt: 2 }}
                            size="small"
                          >
                            Počisti iskanje
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
                        {(() => {
                          // Use memoized filtered hierarchy
                          const filteredHierarchy = filteredDeviceHierarchy;

                          return filteredHierarchy.map((sensorGroup) => (
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
                          ));
                        })()}
                      </Box>
                    );
                  })()}
                </Box>
              </Paper>

              <Box
                sx={{
                  display: "flex",
                  justifyContent: { xs: "center", md: "flex-end" },
                  width: "100%",
                }}
              >
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleClickOpen}
                  startIcon={<AddIcon />}
                  size={isMobile ? "large" : "medium"}
                  sx={{ minWidth: { xs: "200px", md: "auto" } }}
                >
                  Dodaj napravo
                </Button>
              </Box>
            </>
          ) : (
            // Components tab
            <>
              {/* Filter components based on search query */}
              {(() => {
                return (
                  <>
                    {/* Search Bar */}
                    <Box sx={{ mb: 3 }}>
                      <TextField
                        fullWidth
                        variant="outlined"
                        placeholder="Išči komponente po imenu, dobavitelju, e-pošti ali računu..."
                        value={searchState.componentSearchQuery}
                        onChange={(e) =>
                          dispatchSearch({ type: 'SET_COMPONENT_SEARCH', query: e.target.value })
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
                      {searchState.componentSearchQuery && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ mt: 1, display: "block" }}
                        >
                          Najdenih {filteredComponents.length} komponent
                          {filteredComponents.length !== 1 ? "" : "a"}
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
                                        Količina
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
                                  ? "Nobena komponenta se ne ujema z vašim iskanjem"
                                  : "Ni komponent v zalogi"}
                              </Typography>
                              <Typography
                                color="text.secondary"
                                variant="body2"
                                sx={{ mt: 1 }}
                              >
                                {componentSearchQuery
                                  ? "Poskusite prilagoditi iskalne terme"
                                  : "Dodajte svojo prvo komponento za začetek"}
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
                                <TableCell>Ime</TableCell>
                                <TableCell>Količina</TableCell>
                                <TableCell>Cena na enoto</TableCell>
                                <TableCell>Dobavitelj</TableCell>
                                <TableCell>Kontakt dobavitelja</TableCell>
                                <TableCell>Zahteve senzorja</TableCell>
                                <TableCell>Datoteka računa</TableCell>
                                <TableCell>Zadnja posodobitev</TableCell>
                                <TableCell>Dejanja</TableCell>
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

                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: { xs: "center", md: "flex-end" },
                        width: "100%",
                      }}
                    >
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={handleClickOpen}
                        startIcon={<AddIcon />}
                        size={isMobile ? "large" : "medium"}
                        sx={{ minWidth: { xs: "200px", md: "auto" } }}
                      >
                        Dodaj {activeTab === 0 ? "napravo" : "komponento"}
                      </Button>
                    </Box>
                  </>
                );
              })()}
            </>
          )}

          {/* Production Capacity Summary - shown on both Devices and Components tabs */}
          {activeTab === 0 && capacitySummary && (
            <Paper elevation={3} sx={{ mb: 3 }}>
              <Box sx={{ p: { xs: 2, md: 4 } }}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    mb: { xs: 2, md: 3 },
                    gap: 1,
                  }}
                >
                  <BuildIcon sx={{ color: "text.secondary" }} />
                  <Typography
                    variant={isMobile ? "h6" : "h5"}
                    sx={{
                      fontWeight: 600,
                      color: "primary.main",
                    }}
                  >
                    Povzetek proizvodnih zmogljivosti
                  </Typography>
                </Box>

                {/* Detailed breakdown per sensor */}
                {productionCapacity && productionCapacity.length > 0 && (
                  <Box>
                    <Typography
                      variant="subtitle1"
                      sx={{
                        mb: { xs: 2, md: 3 },
                        fontWeight: 600,
                        color: "text.primary",
                      }}
                    >
                      Razčlenitev po tipih senzorjev:
                    </Typography>
                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: {
                          xs: "1fr",
                          sm: "repeat(2, 1fr)",
                          lg: "repeat(3, 1fr)",
                        },
                        gap: { xs: 2, md: 3 },
                      }}
                    >
                      {productionCapacity.map((sensor) => (
                        <Card
                          key={sensor.sensorId}
                          variant="outlined"
                          sx={{
                            borderRadius: 2,
                            "&:hover": {
                              boxShadow: 2,
                            },
                          }}
                        >
                          <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                            {/* Sensor Product Image */}
                            <Box sx={{ mb: 2 }}>
                              <SensorImage sensorName={sensor.sensorName} />
                            </Box>

                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                mb: 2,
                              }}
                            >
                              <Typography
                                variant="subtitle2"
                                sx={{
                                  fontWeight: 600,
                                  color: "text.primary",
                                  flex: 1,
                                  mr: 1,
                                }}
                              >
                                {sensor.sensorName}
                              </Typography>
                              <Chip
                                label={`${sensor.maxProducible} units`}
                                color={
                                  sensor.maxProducible > 0
                                    ? "success"
                                    : "default"
                                }
                                size={isMobile ? "medium" : "small"}
                                sx={{ fontWeight: 600 }}
                              />
                            </Box>

                            {sensor.hasAllComponents ? (
                              <Box>
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                  sx={{ mb: 1 }}
                                >
                                  Can assemble{" "}
                                  <strong>{sensor.maxProducible}</strong>{" "}
                                  sensors
                                </Typography>
                                <Box
                                  sx={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 0.5,
                                  }}
                                >
                                  {sensor.componentDetails.map((comp, idx) => (
                                    <Typography
                                      key={idx}
                                      variant="caption"
                                      sx={{
                                        color: comp.isLimitingFactor
                                          ? "warning.main"
                                          : "text.secondary",
                                        fontWeight: comp.isLimitingFactor
                                          ? 600
                                          : 400,
                                      }}
                                    >
                                      {comp.name}: {comp.available}/
                                      {comp.required}
                                      {comp.isLimitingFactor && " (limiting)"}
                                    </Typography>
                                  ))}
                                </Box>
                              </Box>
                            ) : (
                              <Box>
                                <Typography
                                  variant="body2"
                                  color="error.main"
                                  sx={{ fontWeight: 500, mb: 1 }}
                                >
                                  Missing components:
                                </Typography>
                                <Box
                                  sx={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 0.5,
                                  }}
                                >
                                  {sensor.componentDetails
                                    .filter(
                                      (comp) => comp.available < comp.required,
                                    )
                                    .map((comp, idx) => (
                                      <Typography
                                        key={idx}
                                        variant="caption"
                                        sx={{
                                          color: "error.main",
                                          fontWeight: 500,
                                        }}
                                      >
                                        {comp.name}: {comp.available}/
                                        {comp.required}
                                        (need {comp.required -
                                          comp.available}{" "}
                                        more)
                                      </Typography>
                                    ))}
                                  {sensor.componentDetails.length === 0 && (
                                    <Typography
                                      variant="caption"
                                      sx={{
                                        color: "error.main",
                                        fontWeight: 500,
                                      }}
                                    >
                                      No component requirements defined for this
                                      sensor
                                    </Typography>
                                  )}
                                </Box>
                              </Box>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </Box>
                  </Box>
                )}
              </Box>
            </Paper>
          )}
        </motion.div>

        <Dialog
          open={isEditDialogOpen}
          onClose={handleClose}
          maxWidth="md"
          fullWidth
          fullScreen={isMobile}
          PaperProps={{
            sx: {
              borderRadius: { xs: 0, md: 2 },
              m: { xs: 0, md: 2 },
              maxHeight: { xs: "100vh", md: "90vh" },
            },
          }}
        >
          <DialogTitle
            sx={{
              backgroundColor: "primary.main",
              color: "primary.contrastText",
              fontWeight: 600,
              position: "sticky",
              top: 0,
              zIndex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Typography variant={isMobile ? "h6" : "h5"} component="div">
              {editItem?.id ? "Edit Item" : "Add Inventory Item"}
            </Typography>
            {isMobile && (
              <IconButton
                onClick={handleClose}
                sx={{ color: "primary.contrastText" }}
              >
                <ExpandMoreIcon sx={{ transform: "rotate(90deg)" }} />
              </IconButton>
            )}
          </DialogTitle>
          <DialogContent
            sx={{
              p: { xs: 2, md: 4 },
              overflow: "auto",
            }}
          >
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  md: activeTab === 1 ? "1fr 1fr" : "1fr",
                },
                gap: { xs: 3, md: 4 },
                mt: 2,
              }}
            >
              <Box>
                {activeTab === 0 ? (
                  <>
                    <Select
                      value={
                        editItem
                          ? (editItem as SenzorStockItem).senzorId || ""
                          : ""
                      }
                      onChange={(e) => {
                        const sensorId = Number(e.target.value);
                        const selectedSensor = allSensors.find(
                          (s) => s.id === sensorId,
                        );
                        if (selectedSensor) {
                          dispatchDialog({
                            type: 'UPDATE_EDIT_ITEM',
                            item: {
                              ...editItem,
                              senzorId: selectedSensor.id,
                              sensorName: selectedSensor.sensorName,
                            } as SenzorStockItem
                          });
                        }
                      }}
                      label="Sensor"
                      fullWidth
                      required
                      className="mb-4"
                      displayEmpty
                    >
                      <MenuItem value="" disabled>
                        Select a sensor
                      </MenuItem>
                      {allSensors.map((sensor) => (
                        <MenuItem key={sensor.id} value={sensor.id}>
                          {sensor.sensorName}
                        </MenuItem>
                      ))}
                    </Select>

                    {/* Frequency dropdown for sensors */}
                    <Select
                      value={
                        editItem && "frequency" in editItem
                          ? (editItem as SenzorStockItem).frequency || ""
                          : ""
                      }
                      onChange={(e) => {
                        if (!editItem) return;
                        dispatchDialog({
                          type: 'UPDATE_EDIT_ITEM',
                          item: {
                            ...editItem,
                            frequency: e.target.value as Frequency,
                          } as SenzorStockItem
                        });
                      }}
                      label="Frequency"
                      fullWidth
                      required
                      className="mb-4"
                    >
                      {frequencyOptions.map((freq) => (
                        <MenuItem key={freq} value={freq}>
                          {freq}
                        </MenuItem>
                      ))}
                    </Select>
                    <TextField
                      margin="dense"
                      id="dev_eui"
                      label="dev_eui"
                      type="text"
                      fullWidth
                      variant="outlined"
                      value={
                        "dev_eui" in (editItem ?? {})
                          ? (editItem as SenzorStockItem).dev_eui || ""
                          : ""
                      }
                      onChange={(e) =>
                        editItem &&
                        dispatchDialog({
                          type: 'UPDATE_EDIT_ITEM',
                          item: {
                            ...editItem,
                            dev_eui: e.target.value,
                          }
                        })
                      }
                      placeholder="Main Warehouse"
                    />
                  </>
                ) : (
                  <>
                    <Select
                      value={
                        (editItem as ComponentStockItem)?.componentId || ""
                      }
                      onChange={(e) => {
                        const componentId = Number(e.target.value);
                        const selectedComponent = componentOptions.find(
                          (c) => c.id === componentId,
                        );
                        if (selectedComponent) {
                          dispatchDialog({
                            type: 'UPDATE_EDIT_ITEM',
                            item: {
                              ...editItem,
                              componentId: selectedComponent.id,
                              name: selectedComponent.name,
                            } as ComponentStockItem
                          });
                        }
                      }}
                      label="Component"
                      fullWidth
                      required
                      className="mb-4"
                      displayEmpty
                    >
                      <MenuItem value="" disabled>
                        Select a component
                      </MenuItem>
                      {componentOptions.map((component) => (
                        <MenuItem key={component.id} value={component.id}>
                          {component.name}
                        </MenuItem>
                      ))}
                    </Select>

                    <TextField
                      margin="dense"
                      id="supplier"
                      label="Supplier *"
                      type="text"
                      fullWidth
                      variant="outlined"
                      value={
                        editItem &&
                          "contactDetails" in editItem &&
                          editItem.contactDetails?.supplier
                          ? editItem.contactDetails.supplier
                          : ""
                      }
                      onChange={(e) => {
                        if (!editItem) return;
                        dispatchDialog({
                          type: 'UPDATE_EDIT_ITEM',
                          item: {
                            ...editItem,
                            contactDetails: {
                              ...(editItem as ComponentStockItem).contactDetails,
                              supplier: e.target.value,
                            },
                          } as ComponentStockItem
                        });
                      }}
                      className="mt-4 mb-4"
                      required
                    />
                    <Typography variant="subtitle1" className="mt-4 mb-2">
                      Supplier Contact
                    </Typography>
                    <TextField
                      margin="dense"
                      id="email"
                      label="Email"
                      type="email"
                      fullWidth
                      variant="outlined"
                      value={
                        (editItem as ComponentStockItem)?.contactDetails
                          ?.email || ""
                      }
                      onChange={(e) => {
                        if (!editItem) return;
                        dispatchDialog({
                          type: 'UPDATE_EDIT_ITEM',
                          item: {
                            ...editItem,
                            contactDetails: {
                              ...(editItem as ComponentStockItem).contactDetails,
                              email: e.target.value,
                            },
                          } as ComponentStockItem
                        });
                      }}
                      className="mb-2"
                    />
                    <TextField
                      margin="dense"
                      id="phone"
                      label="Phone"
                      type="tel"
                      fullWidth
                      variant="outlined"
                      value={
                        (editItem as ComponentStockItem)?.contactDetails
                          ?.phone || ""
                      }
                      onChange={(e) => {
                        if (!editItem) return;
                        dispatchDialog({
                          type: 'UPDATE_EDIT_ITEM',
                          item: {
                            ...editItem,
                            contactDetails: {
                              ...(editItem as ComponentStockItem).contactDetails,
                              phone: e.target.value,
                            },
                          } as ComponentStockItem
                        });
                      }}
                      className="mb-2"
                    />

                    <TextField
                      margin="dense"
                      id="price"
                      label="Price per Item (€)"
                      type="number"
                      fullWidth
                      variant="outlined"
                      value={
                        (editItem as ComponentStockItem)?.price !== undefined
                          ? (editItem as ComponentStockItem).price
                          : ""
                      }
                      onChange={(e) => {
                        if (!editItem) return;
                        const newPrice =
                          e.target.value === ""
                            ? 0
                            : parseFloat(e.target.value);
                        console.log(`Setting price to: ${newPrice}`);
                        dispatchDialog({
                          type: 'UPDATE_EDIT_ITEM',
                          item: {
                            ...editItem,
                            price: newPrice,
                          } as ComponentStockItem
                        });
                      }}
                      className="mb-4"
                      inputProps={{ min: 0, step: 0.01 }}
                    />
                  </>
                )}

                <TextField
                  margin="dense"
                  id="quantity"
                  label="Quantity"
                  type="number"
                  fullWidth
                  variant="outlined"
                  value={editItem?.quantity ?? 0}
                  onChange={(e) =>
                    editItem &&
                    dispatchDialog({
                      type: 'UPDATE_EDIT_ITEM',
                      item: {
                        ...editItem,
                        quantity: Math.max(0, parseInt(e.target.value) || 0),
                      }
                    })
                  }
                  className="mt-4 mb-4"
                  inputProps={{ min: 0 }}
                />

                {/* Add threshold and critical component fields for components */}
                {activeTab === 1 && (
                  <Box sx={{ mb: 3 }}>
                    <TextField
                      margin="dense"
                      id="lowStockThreshold"
                      label="Low Stock Threshold"
                      type="number"
                      fullWidth
                      variant="outlined"
                      value={
                        (editItem as ComponentStockItem)?.lowStockThreshold ??
                        ""
                      }
                      onChange={(e) => {
                        if (!editItem) return;
                        const inputValue = e.target.value;
                        dispatchDialog({
                          type: 'UPDATE_EDIT_ITEM',
                          item: {
                            ...editItem,
                            lowStockThreshold:
                              inputValue === ""
                                ? undefined
                                : Math.max(1, parseInt(inputValue) || 1),
                          } as ComponentStockItem
                        });
                      }}
                      className="mb-3"
                      inputProps={{ min: 0 }}
                      helperText="Component will show warning when quantity falls below this threshold. Leave empty for no threshold."
                    />

                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={
                            (editItem as ComponentStockItem)?.isCritical ??
                            false
                          }
                          onChange={(e) => {
                            if (!editItem) return;
                            dispatchDialog({
                              type: 'UPDATE_EDIT_ITEM',
                              item: {
                                ...editItem,
                                isCritical: e.target.checked,
                              } as ComponentStockItem
                            });
                          }}
                          color="error"
                        />
                      }
                      label={
                        <Box
                          sx={{ display: "flex", alignItems: "center", gap: 1 }}
                        >
                          <Typography variant="body2">
                            Critical Component
                          </Typography>
                          <Tooltip title="Mark this component as critical if it's essential for sensor assembly and production cannot continue without it">
                            <InfoIcon fontSize="small" color="action" />
                          </Tooltip>
                        </Box>
                      }
                      sx={{ mb: 2 }}
                    />
                  </Box>
                )}
              </Box>

              {activeTab === 1 && (
                <Box
                  sx={{
                    borderLeft: 1,
                    borderColor: "divider",
                    pl: { xs: 0, md: 2 },
                    mt: { xs: 3, md: 0 },
                  }}
                >
                  <Typography variant="h6" className="mb-3">
                    Assign to Sensors
                  </Typography>
                  <Typography
                    variant="body2"
                    color="textSecondary"
                    className="mb-4"
                  >
                    Specify how many of this component are needed for each
                    sensor
                  </Typography>

                  <Box sx={{ mb: 3 }}>
                    <Select
                      multiple
                      fullWidth
                      value={sensorOptions
                        .filter((opt) => opt.selected)
                        .map((opt) => opt.id)}
                      onChange={(e) => {
                        const selectedIds = e.target.value as number[];
                        setSensorOptions((prev) =>
                          prev.map((opt) => ({
                            ...opt,
                            selected: selectedIds.includes(opt.id),
                          })),
                        );
                      }}
                      renderValue={(selected) => (
                        <Box
                          sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}
                        >
                          {(selected as number[]).map((id) => {
                            const sensor = allSensors.find((s) => s.id === id);
                            return sensor ? (
                              <Chip key={id} label={sensor.sensorName} />
                            ) : null;
                          })}
                        </Box>
                      )}
                    >
                      {allSensors.map((sensor) => (
                        <MenuItem key={sensor.id} value={sensor.id}>
                          {sensor.sensorName}
                        </MenuItem>
                      ))}
                    </Select>
                  </Box>

                  <Box sx={{ mb: 3, maxHeight: 200, overflowY: "auto" }}>
                    {sensorOptions
                      .filter((option) => option.selected)
                      .map((option) => (
                        <Box
                          key={option.id}
                          sx={{
                            mb: 1,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            borderRadius: 1,
                            bgcolor: "grey.50",
                            p: 1,
                          }}
                        >
                          <Typography>{option.name}</Typography>
                          <TextField
                            size="small"
                            type="number"
                            label="Qty per sensor"
                            value={option.requiredQuantity}
                            onChange={(e) =>
                              handleRequiredQuantityChange(
                                option.id,
                                parseInt(e.target.value) || 1,
                              )
                            }
                            sx={{ width: 100 }}
                            inputProps={{ min: 1 }}
                          />
                        </Box>
                      ))}
                  </Box>

                  <Typography variant="h6" className="mb-3">
                    Invoice Information
                  </Typography>

                  {/* Display newest invoice information when editing */}
                  {editItem?.id && "componentId" in editItem && (
                    <Box
                      sx={{
                        mb: 3,
                        p: 2,
                        borderRadius: 1,
                        border: 1,
                        borderColor: "divider",
                        bgcolor: "primary.50",
                      }}
                    >
                      <Typography
                        variant="subtitle2"
                        color="primary"
                        className="mb-2"
                      >
                        📄 Current Invoice Information
                      </Typography>

                      {loadingInvoiceHistory ? (
                        <Typography variant="body2" color="textSecondary">
                          Loading invoice history...
                        </Typography>
                      ) : invoiceHistory.length > 0 ? (
                        <Box>
                          {invoiceHistory[0] && (
                            <>
                              <Typography variant="body2" className="mb-1">
                                <strong>Latest Invoice:</strong>{" "}
                                {invoiceHistory[0].invoiceNumber}
                              </Typography>
                              {invoiceHistory[0].uploadDate && (
                                <Typography variant="body2" className="mb-1">
                                  <strong>Date:</strong>{" "}
                                  {new Date(
                                    invoiceHistory[0].uploadDate,
                                  ).toLocaleDateString()}
                                </Typography>
                              )}
                              {invoiceHistory[0].amount && (
                                <Typography variant="body2" className="mb-1">
                                  <strong>Amount:</strong> €
                                  {invoiceHistory[0].amount.toFixed(2)}
                                </Typography>
                              )}
                              {invoiceHistory[0].filename ? (
                                <Typography
                                  variant="body2"
                                  color="success.main"
                                >
                                  ✓ Invoice file available
                                </Typography>
                              ) : (
                                <Typography
                                  variant="body2"
                                  color="warning.main"
                                >
                                  ⚠ No file attached
                                </Typography>
                              )}
                            </>
                          )}
                          {invoiceHistory.length > 1 && (
                            <Typography
                              variant="caption"
                              color="textSecondary"
                              className="mt-1"
                              display="block"
                            >
                              ({invoiceHistory.length - 1} older invoice
                              {invoiceHistory.length > 2 ? "s" : ""} available)
                            </Typography>
                          )}
                        </Box>
                      ) : (
                        <Typography variant="body2" color="textSecondary">
                          Za to komponento ni najdenih prejšnjih računov
                        </Typography>
                      )}
                    </Box>
                  )}

                  {/* Display current invoice file information */}
                  {editItem &&
                    "invoiceFile" in editItem &&
                    editItem.invoiceFile && (
                      <Box
                        sx={{
                          mb: 3,
                          borderRadius: 2,
                          border: 1,
                          borderColor: "success.main",
                          bgcolor: "success.light",
                          p: 2,
                        }}
                      >
                        <Typography
                          variant="body2"
                          color="success.dark"
                          className="mb-2"
                        >
                          <strong>Current Invoice File:</strong>
                        </Typography>
                        <Box
                          sx={{ display: "flex", alignItems: "center", gap: 1 }}
                        >
                          <AttachFileIcon
                            sx={{ fontSize: 16, color: "success.dark" }}
                          />
                          <Box sx={{ flex: 1 }}>
                            <Typography
                              variant="body2"
                              fontWeight={500}
                              color="success.dark"
                            >
                              {editItem.invoiceNumber || "Unknown Invoice"}
                            </Typography>
                            <Typography variant="caption" color="success.dark">
                              File: {editItem.invoiceFile}
                            </Typography>
                          </Box>
                          <Button
                            size="small"
                            startIcon={<DownloadIcon />}
                            onClick={() =>
                              handleDownloadInvoiceFile(
                                editItem.invoiceNumber || "",
                                editItem.invoiceFile || "",
                              )
                            }
                            sx={{
                              textTransform: "none",
                              fontSize: "0.75rem",
                              color: "success.dark",
                              "&:hover": {
                                bgcolor: "success.main",
                                color: "white",
                              },
                            }}
                          >
                            Download
                          </Button>
                        </Box>
                      </Box>
                    )}

                  <TextField
                    label="Invoice Number *"
                    fullWidth
                    value={invoiceNumber}
                    onChange={(e) => handleInvoiceNumberChange(e.target.value)}
                    className="mb-4"
                    placeholder="Required for stock increases"
                    required
                  />

                  {/* File upload section with better UI */}
                  <Typography
                    variant="body2"
                    color="textSecondary"
                    className="mb-2"
                  >
                    Upload invoice file (optional):
                  </Typography>

                  {invoiceFile && (
                    <Box
                      sx={{
                        mb: 2,
                        borderRadius: 1,
                        border: 1,
                        borderColor: "divider",
                        bgcolor: "grey.50",
                        p: 1.5,
                      }}
                    >
                      <Typography variant="body2" className="mb-1">
                        <strong>Selected file:</strong> {invoiceFile.name}
                      </Typography>
                      <Typography variant="body2" color="primary">
                        <strong>Bo shranjeno kot:</strong> {invoiceNumber}.
                        {invoiceFile.name.split(".").pop()}
                      </Typography>
                    </Box>
                  )}

                  <Box
                    sx={{
                      cursor: "pointer",
                      borderRadius: 2,
                      border: 2,
                      borderStyle: "dashed",
                      borderColor: isDragging ? "grey.500" : "grey.300",
                      bgcolor: isDragging ? "grey.50" : "transparent",
                      p: 3,
                      textAlign: "center",
                      transition: "all 0.2s",
                      "&:hover": {
                        borderColor: "grey.400",
                      },
                    }}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() =>
                      document.getElementById("invoice-upload")?.click()
                    }
                  >
                    <Typography variant="body1" className="mb-2">
                      {invoiceFile
                        ? "Change file"
                        : "Drop invoice file here or click to browse"}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      PDF files only
                    </Typography>
                    <input
                      id="invoice-upload"
                      type="file"
                      accept=".pdf"
                      onChange={handleFileChange}
                      style={{ display: "none" }}
                    />
                  </Box>
                </Box>
              )}
            </Box>
          </DialogContent>
          <DialogActions
            sx={{
              p: { xs: 2, md: 3 },
              flexDirection: { xs: "column", md: "row" },
              gap: { xs: 1, md: 2 },
              position: { xs: "sticky", md: "static" },
              bottom: { xs: 0, md: "auto" },
              bgcolor: "background.paper",
              borderTop: { xs: "1px solid", md: "none" },
              borderColor: { xs: "divider", md: "transparent" },
            }}
          >
            <Button
              color="error"
              variant="contained"
              onClick={handleDeleteItem}
              fullWidth={isMobile}
              size={isMobile ? "large" : "medium"}
            >
              Izbriši artikel
            </Button>
            <Button
              onClick={handleClose}
              fullWidth={isMobile}
              size={isMobile ? "large" : "medium"}
            >
              Prekliči
            </Button>
            <Button
              onClick={
                activeTab === 0
                  ? handleAddOrUpdateSensor
                  : handleAddOrUpdateComponent
              }
              disabled={uploading}
              variant="contained"
              fullWidth={isMobile}
              size={isMobile ? "large" : "medium"}
            >
              {uploading
                ? "Uploading..."
                : `${editItem?.id ? "Update" : "Add"} Item`}
            </Button>
          </DialogActions>
        </Dialog>
        <Dialog
          open={isDeleteDialogOpen}
          onClose={() => dispatchDialog({ type: 'CLOSE' })}
          fullScreen={isMobile}
          PaperProps={{
            sx: {
              borderRadius: { xs: 0, md: 2 },
              m: { xs: 0, md: 2 },
            },
          }}
        >
          <DialogTitle
            sx={{
              color: "error.main",
              fontWeight: 600,
              fontSize: { xs: "1.25rem", md: "1.5rem" },
            }}
          >
            Ali ste prepričani, da želite izbrisati ta artikel?
          </DialogTitle>
          <DialogContent sx={{ p: { xs: 2, md: 3 } }}>
            <Typography color="error" variant="body1">
              This action cannot be undone!
            </Typography>
          </DialogContent>
          <DialogActions
            sx={{
              p: { xs: 2, md: 3 },
              flexDirection: { xs: "column", md: "row" },
              gap: { xs: 1, md: 2 },
            }}
          >
            <Button
              onClick={() => dispatchDialog({ type: 'CLOSE' })}
              fullWidth={isMobile}
              size={isMobile ? "large" : "medium"}
            >
              Prekliči
            </Button>
            <Button
              color="error"
              variant="contained"
              onClick={handleDeleteItem}
              fullWidth={isMobile}
              size={isMobile ? "large" : "medium"}
            >
              Delete
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={isAdjustmentDialogOpen}
          onClose={() => dispatchDialog({ type: 'CLOSE' })}
          fullScreen={isMobile}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: { xs: 0, md: 2 },
              m: { xs: 0, md: 2 },
              maxHeight: { xs: "100vh", md: "90vh" },
            },
          }}
        >
          <DialogTitle
            sx={{
              fontWeight: 600,
              fontSize: { xs: "1.25rem", md: "1.5rem" },
              position: "sticky",
              top: 0,
              zIndex: 1,
              bgcolor: "background.paper",
              borderBottom: { xs: "1px solid", md: "none" },
              borderColor: { xs: "divider", md: "transparent" },
            }}
          >
            {adjustmentType === "increase"
              ? "Increase Quantity"
              : "Decrease Quantity"}
          </DialogTitle>
          <DialogContent
            sx={{
              p: { xs: 2, md: 3 },
              overflow: "auto",
            }}
          >
            {currentAdjustItem && (
              <Box
                sx={{
                  mb: 3,
                  p: { xs: 2, md: 3 },
                  bgcolor: "grey.50",
                  borderRadius: 2,
                }}
              >
                <Typography variant="h6" sx={{ mb: 1 }}>
                  {"sensorName" in currentAdjustItem
                    ? currentAdjustItem.sensorName
                    : currentAdjustItem.name}
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Current Quantity:{" "}
                  <strong>{currentAdjustItem.quantity}</strong>
                </Typography>
              </Box>
            )}

            <TextField
              autoFocus
              margin="dense"
              label={
                adjustmentType === "increase"
                  ? "Amount to Add"
                  : "Amount to Remove"
              }
              type="number"
              fullWidth
              variant="outlined"
              value={adjustmentQuantity}
              onChange={(e) =>
                dispatchDialog({
                  type: 'UPDATE_ADJUSTMENT_DATA',
                  data: { adjustmentQuantity: Math.max(1, parseInt(e.target.value) || 1) }
                })
              }
              inputProps={{ min: 1 }}
              sx={{ mb: 3 }}
            />

            <TextField
              label={
                adjustmentType === "increase"
                  ? "Reason for increase (e.g. purchase reference)"
                  : "Reason for decrease (required)"
              }
              fullWidth
              multiline
              rows={3}
              value={adjustmentReason}
              onChange={(e) => dispatchDialog({
                type: 'UPDATE_ADJUSTMENT_DATA',
                data: { adjustmentReason: e.target.value }
              })}
              required
              sx={{ mb: 3 }}
            />
            {activeTab === 0 && (
              <TextField
                label={
                  adjustmentType === "increase"
                    ? "device eui of new sensor "
                    : "Reason for decrease (required)"
                }
                fullWidth
                multiline
                rows={3}
                value={adjustmentReason}
                onChange={(e) => dispatchDialog({
                  type: 'UPDATE_ADJUSTMENT_DATA',
                  data: { adjustmentReason: e.target.value }
                })}
                required
                sx={{ mb: 3 }}
              />
            )}

            {adjustmentType === "increase" &&
              currentAdjustItem &&
              "componentId" in currentAdjustItem && (
                <>
                  <TextField
                    label="Invoice Number *"
                    fullWidth
                    value={invoiceNumber}
                    onChange={(e) => handleInvoiceNumberChange(e.target.value)}
                    required
                    sx={{ mb: 3 }}
                  />

                  {/* File upload section for adjustments */}
                  <Box sx={{ mb: 3 }}>
                    <Typography
                      variant="body2"
                      color="textSecondary"
                      sx={{ mb: 2 }}
                    >
                      Upload invoice file (optional):
                    </Typography>

                    {invoiceFile && (
                      <Box
                        sx={{
                          mb: 2,
                          borderRadius: 1,
                          border: 1,
                          borderColor: "divider",
                          bgcolor: "grey.50",
                          p: 1.5,
                        }}
                      >
                        <Typography variant="body2">
                          <strong>Selected file:</strong> {invoiceFile.name}
                        </Typography>
                      </Box>
                    )}

                    <Box
                      sx={{
                        cursor: "pointer",
                        borderRadius: 2,
                        border: 2,
                        borderStyle: "dashed",
                        borderColor: isDragging ? "grey.500" : "grey.300",
                        bgcolor: isDragging ? "grey.50" : "transparent",
                        p: 2,
                        textAlign: "center",
                        transition: "all 0.2s",
                        "&:hover": {
                          borderColor: "grey.400",
                        },
                      }}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() =>
                        document
                          .getElementById("adjustment-invoice-upload")
                          ?.click()
                      }
                    >
                      <Typography variant="body2">
                        {invoiceFile
                          ? "Change file"
                          : "Drop invoice file here or click to browse"}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        PDF files only
                      </Typography>
                      <input
                        id="adjustment-invoice-upload"
                        type="file"
                        accept=".pdf"
                        onChange={handleFileChange}
                        style={{ display: "none" }}
                      />
                    </Box>
                  </Box>
                </>
              )}
          </DialogContent>
          <DialogActions
            sx={{
              p: { xs: 2, md: 3 },
              flexDirection: { xs: "column", md: "row" },
              gap: { xs: 1, md: 2 },
              position: { xs: "sticky", md: "static" },
              bottom: { xs: 0, md: "auto" },
              bgcolor: "background.paper",
              borderTop: { xs: "1px solid", md: "none" },
              borderColor: { xs: "divider", md: "transparent" },
            }}
          >
            <Button
              onClick={() => dispatchDialog({ type: 'CLOSE' })}
              fullWidth={isMobile}
              size={isMobile ? "large" : "medium"}
            >
              Prekliči
            </Button>
            <Button
              onClick={confirmAdjustment}
              disabled={
                !adjustmentReason ||
                (adjustmentType === "increase" &&
                  "componentId" in (currentAdjustItem ?? {}) &&
                  !invoiceNumber)
              }
              variant="contained"
              fullWidth={isMobile}
              size={isMobile ? "large" : "medium"}
            >
              Confirm
            </Button>
          </DialogActions>
        </Dialog>

        {/* Device Action Dialog */}
        <Dialog
          open={isDeviceActionDialogOpen}
          onClose={() => dispatchDialog({ type: 'CLOSE' })}
          fullScreen={isMobile}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: { xs: 0, md: 2 },
              m: { xs: 0, md: 2 },
            },
          }}
        >
          <DialogTitle
            sx={{
              fontWeight: 600,
              fontSize: { xs: "1.25rem", md: "1.5rem" },
            }}
          >
            Device Actions - {currentDevice?.devEUI}
          </DialogTitle>
          <DialogContent sx={{ p: { xs: 2, md: 3 } }}>
            <Box sx={{ mt: 2 }}>
              <Typography variant="body1" sx={{ mb: 3 }}>
                Choose an action for this device:
              </Typography>

              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {/* Assign to Order */}
                <Button
                  variant="outlined"
                  startIcon={<ShoppingCartIcon />}
                  onClick={() => {
                    // Show order selection
                    dispatchDialog({
                      type: 'UPDATE_DEVICE_ACTION_DATA',
                      data: { showOrderSelection: true }
                    });
                  }}
                  disabled={!currentDevice?.isAvailable}
                  fullWidth
                  sx={{ justifyContent: "flex-start" }}
                >
                  Assign to Order
                  {!currentDevice?.isAvailable && " (Already Assigned)"}
                </Button>

                {/* Edit Frequency */}
                <Button
                  variant="outlined"
                  startIcon={<RadioIcon />}
                  onClick={() => {
                    if (currentDevice) {
                      openFrequencyEditDialog(currentDevice);
                    }
                  }}
                  fullWidth
                  sx={{ justifyContent: "flex-start" }}
                >
                  Edit Frequency
                  {currentDevice?.frequency &&
                    ` (Current: ${currentDevice.frequency})`}
                </Button>

                {/* Release from Order */}
                <Button
                  variant="outlined"
                  startIcon={<AssignmentIcon />}
                  onClick={() => confirmDeviceAction("release")}
                  disabled={currentDevice?.isAvailable}
                  fullWidth
                  sx={{ justifyContent: "flex-start" }}
                >
                  Release from Order
                  {currentDevice?.isAvailable && " (Not Assigned)"}
                </Button>

                {/* Remove from Inventory */}
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={() => confirmDeviceAction("remove")}
                  fullWidth
                  sx={{ justifyContent: "flex-start" }}
                >
                  Remove from Inventory
                </Button>
              </Box>

              {/* Order Selection for Assignment */}
              {showOrderSelection && currentDevice?.isAvailable && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Select Order (for assignment):
                  </Typography>
                  <Select
                    value={selectedOrderId || ""}
                    onChange={(e) => dispatchDialog({
                      type: 'UPDATE_DEVICE_ACTION_DATA',
                      data: { selectedOrderId: Number(e.target.value) }
                    })}
                    fullWidth
                    size="small"
                    displayEmpty
                  >
                    <MenuItem value="">
                      <em>Select an order...</em>
                    </MenuItem>
                    {allOrders.map((order) => {
                      const totalQuantity = order.items.reduce(
                        (sum, item) => sum + item.quantity,
                        0,
                      );
                      const remainingToAssign =
                        totalQuantity - order.assignedDevices;
                      if (remainingToAssign <= 0) return null;
                      return (
                        <MenuItem key={order.id} value={order.id}>
                          Order #{order.id} - {order.customerName} (
                          {remainingToAssign} remaining)
                        </MenuItem>
                      );
                    })}
                  </Select>
                  <Box sx={{ mt: 2, display: "flex", gap: 1 }}>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => {
                        dispatchDialog({
                          type: 'UPDATE_DEVICE_ACTION_DATA',
                          data: { showOrderSelection: false, selectedOrderId: null }
                        });
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => confirmDeviceAction("assign")}
                      disabled={!selectedOrderId}
                    >
                      Confirm Assignment
                    </Button>
                  </Box>
                </Box>
              )}

              {/* Reason Input */}
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Reason (optional):
                </Typography>
                <TextField
                  value={deviceActionReason}
                  onChange={(e) => dispatchDialog({
                    type: 'UPDATE_DEVICE_ACTION_DATA',
                    data: { deviceActionReason: e.target.value }
                  })}
                  placeholder="Enter reason for this action..."
                  multiline
                  rows={2}
                  fullWidth
                  size="small"
                />
              </Box>
            </Box>
          </DialogContent>
          <DialogActions
            sx={{
              p: { xs: 2, md: 3 },
              flexDirection: { xs: "column", md: "row" },
              gap: { xs: 1, md: 2 },
            }}
          >
            <Button
              onClick={() => {
                dispatchDialog({ type: 'CLOSE' });
              }}
              fullWidth={isMobile}
              size={isMobile ? "large" : "medium"}
            >
              Cancel
            </Button>
            {!showOrderSelection && (
              <Button
                onClick={() => confirmDeviceAction("assign")}
                disabled={!selectedOrderId || !currentDevice?.isAvailable}
                variant="contained"
                fullWidth={isMobile}
                size={isMobile ? "large" : "medium"}
              >
                Assign to Selected Order
              </Button>
            )}
          </DialogActions>
        </Dialog>

        {/* Frequency Edit Dialog */}
        <Dialog
          open={isFrequencyEditDialogOpen}
          onClose={() => dispatchDialog({ type: 'CLOSE' })}
          fullScreen={isMobile}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: { xs: 0, md: 2 },
              m: { xs: 0, md: 2 },
            },
          }}
        >
          <DialogTitle
            sx={{
              fontWeight: 600,
              fontSize: { xs: "1.25rem", md: "1.5rem" },
            }}
          >
            Edit Frequency - {editingFrequencyDevice?.devEUI}
          </DialogTitle>
          <DialogContent sx={{ p: { xs: 2, md: 3 } }}>
            <Box sx={{ mt: 2 }}>
              <Typography variant="body1" sx={{ mb: 3 }}>
                Current frequency:{" "}
                {editingFrequencyDevice?.frequency || "Not set"}
              </Typography>

              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Select New Frequency:
              </Typography>
              <Select
                value={newFrequency}
                onChange={(e) => dispatchDialog({
                  type: 'UPDATE_FREQUENCY_DATA',
                  data: { newFrequency: e.target.value }
                })}
                fullWidth
                size="small"
                displayEmpty
              >
                <MenuItem value="">
                  <em>Select frequency...</em>
                </MenuItem>
                {frequencyOptions.map((freq) => (
                  <MenuItem key={freq} value={freq}>
                    {freq}
                  </MenuItem>
                ))}
              </Select>
            </Box>
          </DialogContent>
          <DialogActions
            sx={{
              p: { xs: 2, md: 3 },
              flexDirection: { xs: "column", md: "row" },
              gap: { xs: 1, md: 2 },
            }}
          >
            <Button
              onClick={() => {
                dispatchDialog({ type: 'CLOSE' });
              }}
              fullWidth={isMobile}
              size={isMobile ? "large" : "medium"}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateFrequency}
              disabled={
                !newFrequency ||
                newFrequency === editingFrequencyDevice?.frequency
              }
              variant="contained"
              fullWidth={isMobile}
              size={isMobile ? "large" : "medium"}
            >
              Update Frequency
            </Button>
          </DialogActions>
        </Dialog>

        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          <Alert
            onClose={() => setSnackbar({ ...snackbar, open: false })}
            severity={snackbar.severity}
            sx={{ width: "100%" }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Container>
    </>
  );
}
