"use client";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Snackbar,
  Alert,
  Typography,
  Box,
  Chip,
  Tabs,
  Tab,
  MenuItem,
  Select,
  Card,
  CardContent,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import EditIcon from "@mui/icons-material/Edit";
import HistoryIcon from "@mui/icons-material/History";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import MemoryIcon from "@mui/icons-material/Memory";
import RadioIcon from "@mui/icons-material/Radio";
import BuildIcon from "@mui/icons-material/Build";
//import WarningIcon from '@mui/icons-material/Warning';
//import InfoIcon from '@mui/icons-material/Info';
import {
  addComponentToInventory,
  addSensorToInventory,
  adjustComponentStock,
  adjustSensorStock,
  deleteComponentFromInventory,
  deleteSensorFromInventory,
  getAllComponents,
  getSensors,
  showAllComponents,
  showLogs,
  showSensorInInventory,
  updateComponentSensorAssignments,
  updateComponentStock,
  getProductionHierarchy,
  getProductionByFrequency,
  getProductionDevices,
  getSensorProductionCapacity,
  getProductionCapacitySummary,
} from "src/app/inventory/components/backent";
import { useQuery } from "@tanstack/react-query";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { uploadPDFToB2 } from "src/app/inventory/components/aws";

const theme = createTheme({
  palette: {
    primary: {
      main: "#15803d",
    },
    secondary: {
      main: "#0369a1",
    },
  },
});

type Frequency = "868 MHz" | "915 MHz" | "433 MHz" | "2.4 GHz" | "Custom";

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
  contactDetails: ContactDetails;
  price?: number; // Price per item
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

export default function InventoryManagementPage() {
  const [activeTab, setActiveTab] = useState(0);
  const [sensorInventory, setSensorInventory] = useState<SenzorStockItem[]>([]);
  const [componentInventory, setComponentInventory] = useState<
    ComponentStockItem[]
  >([]);

  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error" | "info" | "warning",
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sensorOptions, setSensorOptions] = useState<SensorOption[]>([]);
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [adjustmentReason, setAdjustmentReason] = useState("");
  const [device_eui, set_device_eui] = useState("");
  const [adjustmentDialogOpen, setAdjustmentDialogOpen] = useState(false);
  const [currentAdjustItem, setCurrentAdjustItem] =
    useState<InventoryItem | null>(null);
  const [adjustmentType, setAdjustmentType] = useState<"increase" | "decrease">(
    "increase",
  );
  const [adjustmentQuantity, setAdjustmentQuantity] = useState(1);
  const queryClient = useQueryClient();
  const frequencyOptions: Frequency[] = [
    "868 MHz",
    "915 MHz",
    "433 MHz",
    "2.4 GHz",
    "Custom",
  ];

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
        contactDetails: {
          supplier: "",
          email: "",
          phone: "",
        },
      } as ComponentStockItem;
    }
  }, [activeTab]);
  const [uploading, setUploading] = useState(false);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      // Create a new file with the invoice number as filename, preserving extension
      const fileExtension = file.name.split(".").pop();
      const newFileName = `${invoiceNumber}.${fileExtension}`;

      // Create a new File object with the updated name
      const renamedFile = new File([file], newFileName, { type: file.type });

      return await uploadPDFToB2(renamedFile, invoiceNumber);
    },
    onSuccess: () => {
      setSnackbar({
        open: true,
        message: `Invoice uploaded successfully as: ${invoiceNumber}`,
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!invoiceFile) {
      alert("Please select a file to upload.");
      return;
    }

    setUploading(true);
    await uploadMutation.mutateAsync(invoiceFile);
    setUploading(false);
  };

  const { data: allSensors = [] } = useQuery({
    queryKey: ["sensors"],
    queryFn: getSensors,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: allComponents = [] } = useQuery({
    queryKey: ["components-inventory"],
    queryFn: showAllComponents,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: rawInventory = [] } = useQuery({
    queryKey: ["sensors-inventory"],
    queryFn: showSensorInInventory,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: logs = [] } = useQuery({
    queryKey: ["inventory-logs"],
    queryFn: showLogs,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
  const { data: componentOptions = [] } = useQuery({
    queryKey: ["all-components"],
    queryFn: getAllComponents,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
  // Debug: Track when rawInventory changes
  useEffect(() => {
    if (rawInventory) {
      console.log("rawInventory changed, length:", rawInventory.length);
    }
  }, [rawInventory]);

  // Use React Query for production hierarchy data with proper caching
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
    enabled: activeTab === 0, // Only fetch when on sensors tab
    staleTime: 15 * 60 * 1000, // 15 minutes cache
    gcTime: 60 * 60 * 1000, // 1 hour garbage collection
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnMount: false, // Don't refetch on every mount
  });

  // Use React Query for production capacity data
  const { data: productionCapacity = [] } = useQuery({
    queryKey: ["production-capacity"],
    queryFn: getSensorProductionCapacity,
    enabled: activeTab === 0, // Only fetch when on sensors tab
    staleTime: 10 * 60 * 1000, // 10 minutes cache
    refetchOnWindowFocus: false,
  });

  const { data: capacitySummary } = useQuery({
    queryKey: ["capacity-summary"],
    queryFn: getProductionCapacitySummary,
    enabled: activeTab === 0, // Only fetch when on sensors tab
    staleTime: 10 * 60 * 1000, // 10 minutes cache
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (open && activeTab === 1) {
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
      setInvoiceNumber(componentItem.invoiceNumber || "");
    }
  }, [open, editItem, activeTab, allSensors]);

  useEffect(() => {
    if (!open) {
      // Initialize directly to avoid circular dependency
      if (activeTab === 0) {
        setEditItem({
          id: 0,
          senzorId: 0,
          sensorName: "",
          quantity: 1,
          location: "Main Warehouse",
          lastUpdated: new Date(),
          frequency: "868 MHz" as Frequency,
        } as SenzorStockItem);
      } else {
        setEditItem({
          id: 0,
          componentId: 0,
          name: "",
          quantity: 1,
          location: "Main Warehouse",
          lastUpdated: new Date(),
          sensorAssignments: [],
          invoiceNumber: "",
          price: 0,
          contactDetails: {
            supplier: "",
            email: "",
            phone: "",
          },
        } as ComponentStockItem);
      }
      setInvoiceNumber("");
    }
  }, [activeTab, open]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

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
        message: (error as Error)?.message || "Failed to add sensor",
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
        message: `Item ${editItem.id ? "updated" : "added"} successfully!`,
        severity: "success",
      });
      handleClose();
    } catch (error) {
      console.error("Error saving item:", error);
      setSnackbar({
        open: true,
        message: "Failed to save item: " + (error as Error).message,
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
    }) => {
      return adjustComponentStock(
        params.stockId,
        params.quantity,
        params.reason,
        params.invoiceNumber || null,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["components-inventory"] });
      // Če je dialog še odprt, ponovno nastavi editItem iz svežih podatkov
      if (open && editItem && "componentId" in editItem) {
        const freshComponent = allComponents.find((c) => c.id === editItem.id);
        setEditItem(freshComponent ?? editItem);
      }
    },
    onError: (error: unknown) => {
      setSnackbar({
        open: true,
        message:
          (error as Error)?.message || "Failed to adjust component stock",
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
      contactDetails: (editItem as ComponentStockItem).contactDetails ?? {
        supplier: "",
        email: "",
        phone: "",
      },
    };

    try {
      if (editItem.id) {
        await updateComponentStock(
          editItem.id,
          updatedItem.quantity,
          "Manual update",
          newQuantity > currentQuantity ? invoiceNumber : undefined,
          updatedItem.location,
          updatedItem.contactDetails.email,
          updatedItem.contactDetails.supplier,
          updatedItem.contactDetails.phone,
          updatedItem.price, // <-- Add price parameter
        );

        await updateComponentSensorAssignments(
          updatedItem.componentId,
          updatedItem.sensorAssignments,
        );

        // Osveži podatke iz baze!
        queryClient.invalidateQueries({ queryKey: ["components-inventory"] });

        setSnackbar({
          open: true,
          message: "Component updated successfully!",
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
          updatedItem.price, // <-- Add price parameter
        );

        queryClient.invalidateQueries({ queryKey: ["components-inventory"] });

        setSnackbar({
          open: true,
          message: "Component added successfully!",
          severity: "success",
        });
      }
      if (invoiceFile) {
        await handleSubmit({
          preventDefault: () => {},
        } as React.FormEvent<HTMLFormElement>);
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
        await deleteSensorFromInventory(editItem.id!);
      } else {
        await deleteComponentFromInventory(editItem.id!);
      }
      setSnackbar({
        open: true,
        message: "Item deleted successfully!",
        severity: "success",
      });
      setDeleteDialogOpen(false);
      handleClose();
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Failed to delete item: " + (error as Error).message,
        severity: "error",
      });
    }
  };
  // ...obstoječa koda...
  const adjustSensorStockMutation = useMutation({
    mutationFn: async ({
      stockId,
      quantity,
      reason,
    }: {
      stockId: number;
      quantity: number;
      reason: string;
    }) => {
      return adjustSensorStock(stockId, quantity, reason);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sensors-inventory"] });
    },
    onError: (error: unknown) => {
      setSnackbar({
        open: true,
        message: (error as Error)?.message || "Failed to adjust sensor stock",
        severity: "error",
      });
    },
  });

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
      if ("senzorId" in currentAdjustItem) {
        await adjustSensorStockMutation.mutateAsync({
          stockId: currentAdjustItem.id!,
          quantity: change,
          reason: adjustmentReason,
        });
      } else {
        await adjustComponentStockMutation.mutateAsync({
          stockId: currentAdjustItem.id!,
          quantity: change,
          reason: adjustmentReason,
          invoiceNumber: (currentAdjustItem as ComponentStockItem)
            .invoiceNumber,
        });
      }

      setAdjustmentDialogOpen(false);
    } catch (error) {
      console.error("Adjustment failed:", error);
    }
  };
  const handleEditItem = (item: InventoryItem) => {
    // Če je komponenta, poišči najnovejši vnos iz allComponents
    if ("componentId" in item) {
      const freshComponent = allComponents.find((c) => c.id === item.id);
      setEditItem(freshComponent ?? item);
    } else {
      setEditItem(item);
    }
    setOpen(true);
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

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-7xl"
        >
          <Box className="mb-8 flex items-center justify-between">
            <Typography
              variant="h3"
              component="h1"
              className="font-bold text-green-700"
            >
              Inventory Management
            </Typography>
          </Box>

          <Tabs value={activeTab} onChange={handleTabChange} className="mb-6">
            <Tab label="Devices" />
            <Tab label="Components" />
            <Tab label="Logs" icon={<HistoryIcon />} />
          </Tabs>

          {activeTab === 2 ? (
            // Logs tab
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
                        <TableCell>{log.timestamp.toLocaleString()}</TableCell>
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
          ) : activeTab === 0 ? (
            // Sensors tab
            <>
              {/* Production Capacity Summary */}
              {capacitySummary && (
                <Paper elevation={3} className="mb-6">
                  <Box className="p-4">
                    <Box className="mb-4 flex items-center">
                      <BuildIcon className="mr-2 text-blue-600" />
                      <Typography
                        variant="h6"
                        className="font-bold text-blue-800"
                      >
                        Povzetek proizvodnih zmogljivosti
                      </Typography>
                    </Box>

                    <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                      <Card>
                        <CardContent className="text-center">
                          <Typography color="textSecondary" gutterBottom>
                            Skupno tipov senzorjev
                          </Typography>
                          <Typography variant="h4" component="div">
                            {capacitySummary.totalSensorTypes}
                          </Typography>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="text-center">
                          <Typography color="textSecondary" gutterBottom>
                            S komponentami
                          </Typography>
                          <Typography
                            variant="h4"
                            component="div"
                            className="text-green-600"
                          >
                            {capacitySummary.sensorsWithComponents}
                          </Typography>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="text-center">
                          <Typography color="textSecondary" gutterBottom>
                            Skupno lahko sestavimo
                          </Typography>
                          <Typography
                            variant="h4"
                            component="div"
                            className="text-blue-600"
                          >
                            {capacitySummary.totalProducibleUnits}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            senzorjev
                          </Typography>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Detailed breakdown per sensor */}
                    {productionCapacity && productionCapacity.length > 0 && (
                      <Box className="mt-4">
                        <Typography
                          variant="subtitle1"
                          className="mb-3 font-semibold"
                        >
                          Podrobnosti po tipih senzorjev:
                        </Typography>
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                          {productionCapacity.map((sensor) => (
                            <Card key={sensor.sensorId} variant="outlined">
                              <CardContent className="p-3">
                                <Box className="mb-2 flex items-center justify-between">
                                  <Typography
                                    variant="subtitle2"
                                    className="font-medium"
                                  >
                                    {sensor.sensorName}
                                  </Typography>
                                  <Chip
                                    label={`${sensor.maxProducible} kos`}
                                    color={
                                      sensor.maxProducible > 0
                                        ? "success"
                                        : "default"
                                    }
                                    size="small"
                                  />
                                </Box>

                                {sensor.hasAllComponents ? (
                                  <Box>
                                    <Typography
                                      variant="caption"
                                      color="textSecondary"
                                      className="mb-1 block"
                                    >
                                      Lahko sestavite{" "}
                                      <strong>{sensor.maxProducible}</strong>{" "}
                                      senzorjev
                                    </Typography>
                                    {sensor.componentDetails.map(
                                      (comp, idx) => (
                                        <Typography
                                          key={idx}
                                          variant="caption"
                                          className={`block ${comp.isLimitingFactor ? "font-medium text-orange-600" : "text-gray-600"}`}
                                        >
                                          {comp.name}: {comp.available}/
                                          {comp.required}
                                          {comp.isLimitingFactor &&
                                            " (omejuje)"}
                                        </Typography>
                                      ),
                                    )}
                                  </Box>
                                ) : (
                                  <Typography variant="caption" color="error">
                                    Manjkajo komponente
                                  </Typography>
                                )}
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </Box>
                    )}
                  </Box>
                </Paper>
              )}

              {/* Hierarhični prikaz senzorjev */}
              <Paper elevation={3} className="mb-8 overflow-hidden">
                <Box className="p-4">
                  <Typography variant="h6" className="mb-4">
                    Device Inventory - Hierarchical View
                  </Typography>

                  {productionHierarchy.length === 0 ? (
                    <Typography
                      color="textSecondary"
                      className="py-8 text-center"
                    >
                      No devices in inventory
                    </Typography>
                  ) : (
                    <div className="space-y-2">
                      {productionHierarchy.map((sensorGroup) => (
                        <div
                          key={sensorGroup.deviceType}
                          className="rounded-lg border"
                        >
                          {/* Nivo 1: Device Type */}
                          <div
                            className="flex cursor-pointer items-center justify-between bg-green-50 p-4 hover:bg-green-100"
                            onClick={() =>
                              toggleSensorExpanded(sensorGroup.deviceType)
                            }
                          >
                            <div className="flex items-center space-x-3">
                              <IconButton size="small">
                                {sensorGroup.expanded ? (
                                  <ExpandMoreIcon />
                                ) : (
                                  <ChevronRightIcon />
                                )}
                              </IconButton>
                              <MemoryIcon className="text-green-600" />
                              <Typography
                                variant="h6"
                                className="font-bold text-green-800"
                              >
                                {sensorGroup.deviceType}
                              </Typography>
                              <Chip
                                label={`Total: ${sensorGroup.totalDevices}`}
                                color="primary"
                                size="small"
                              />
                            </div>
                            <Box className="flex items-center space-x-2">
                              {/* Add button disabled for production list view */}
                            </Box>
                          </div>

                          {/* Nivo 2: Frekvence */}
                          <AnimatePresence>
                            {sensorGroup.expanded && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.3 }}
                                className="border-t"
                              >
                                {sensorGroup.frequencies.map((freqGroup) => (
                                  <div
                                    key={freqGroup.frequency}
                                    className="border-b last:border-b-0"
                                  >
                                    <div
                                      className="flex cursor-pointer items-center justify-between bg-blue-50 p-3 pl-12 hover:bg-blue-100"
                                      onClick={() =>
                                        toggleFrequencyExpanded(
                                          sensorGroup.deviceType,
                                          freqGroup.frequency,
                                        )
                                      }
                                    >
                                      <div className="flex items-center space-x-3">
                                        <IconButton size="small">
                                          {freqGroup.expanded ? (
                                            <ExpandMoreIcon />
                                          ) : (
                                            <ChevronRightIcon />
                                          )}
                                        </IconButton>
                                        <RadioIcon className="text-blue-600" />
                                        <Typography
                                          variant="subtitle1"
                                          className="font-semibold text-blue-800"
                                        >
                                          {freqGroup.frequency}
                                        </Typography>
                                        <Chip
                                          label={`${freqGroup.count} devices`}
                                          color="secondary"
                                          size="small"
                                          variant="outlined"
                                        />
                                      </div>
                                    </div>

                                    {/* Nivo 3: Posamezni senzorji (device EUI) */}
                                    <AnimatePresence>
                                      {freqGroup.expanded && (
                                        <motion.div
                                          initial={{ opacity: 0, height: 0 }}
                                          animate={{
                                            opacity: 1,
                                            height: "auto",
                                          }}
                                          exit={{ opacity: 0, height: 0 }}
                                          transition={{ duration: 0.3 }}
                                          className="bg-gray-50"
                                        >
                                          {freqGroup.devices.map((device) => (
                                            <div
                                              key={device.id}
                                              className="border-b p-3 pl-20 last:border-b-0 hover:bg-gray-100"
                                            >
                                              <div className="flex items-center justify-between">
                                                <div className="flex items-center space-x-3">
                                                  <Typography
                                                    variant="body2"
                                                    className="font-mono"
                                                  >
                                                    DevEUI:{" "}
                                                    {device.devEUI || "N/A"}
                                                  </Typography>
                                                  <Typography
                                                    variant="body2"
                                                    color="textSecondary"
                                                  >
                                                    AppEUI:{" "}
                                                    {device.appEUI || "N/A"}
                                                  </Typography>
                                                  <Typography
                                                    variant="body2"
                                                    color="textSecondary"
                                                  >
                                                    HW:{" "}
                                                    {device.hwVersion || "N/A"}
                                                  </Typography>
                                                  <Typography
                                                    variant="body2"
                                                    color="textSecondary"
                                                  >
                                                    FW:{" "}
                                                    {device.fwVersion || "N/A"}
                                                  </Typography>
                                                </div>
                                                <div className="flex items-center space-x-2">
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
                                                </div>
                                              </div>
                                            </div>
                                          ))}
                                        </motion.div>
                                      )}
                                    </AnimatePresence>
                                  </div>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      ))}
                    </div>
                  )}
                </Box>
              </Paper>

              <Box className="flex justify-end">
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleClickOpen}
                  startIcon={<AddIcon />}
                >
                  Add Device
                </Button>
              </Box>
            </>
          ) : (
            // Components tab
            <>
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
                        <TableCell>Last Updated</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      <AnimatePresence>
                        {allComponents.length > 0 &&
                          allComponents.map((item1) => (
                            <motion.tr
                              key={item1.id}
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.3 }}
                            >
                              <TableCell className="font-bold">
                                {item1.name || "-"}
                              </TableCell>
                              <TableCell>
                                <Box className="flex items-center">
                                  <IconButton
                                    size="small"
                                    onClick={() =>
                                      openAdjustmentDialog(item1, "decrease")
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
                                      openAdjustmentDialog(item1, "increase")
                                    }
                                  >
                                    <AddIcon />
                                  </IconButton>
                                </Box>
                              </TableCell>
                              <TableCell>
                                {item1.price
                                  ? `€${item1.price.toFixed(2)}`
                                  : "-"}
                              </TableCell>
                              <TableCell>
                                {item1.contactDetails?.supplier || "-"}
                              </TableCell>
                              <TableCell>
                                {item1.contactDetails?.email ? (
                                  item1.contactDetails.email.includes("@") ? (
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
                                {Array.isArray(item1.sensorAssignments) &&
                                item1.sensorAssignments.length > 0
                                  ? item1.sensorAssignments
                                      .map(
                                        (sa) =>
                                          `${sa.sensorName} (${sa.requiredQuantity})`,
                                      )
                                      .join(", ")
                                  : "-"}
                              </TableCell>
                              <TableCell>
                                {item1.lastUpdated?.toLocaleString?.() || "-"}
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

              <Box className="flex justify-end">
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleClickOpen}
                  startIcon={<AddIcon />}
                >
                  Add {activeTab === 0 ? "Device" : "Component"}
                </Button>
              </Box>
            </>
          )}
        </motion.div>
      </div>

      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>
          {editItem?.id ? "Edit Item" : "Add Inventory Item"}
        </DialogTitle>
        <DialogContent className="p-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
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
                        setEditItem({
                          ...editItem,
                          senzorId: selectedSensor.id,
                          sensorName: selectedSensor.sensorName,
                        } as SenzorStockItem);
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
                      setEditItem({
                        ...editItem,
                        frequency: e.target.value as Frequency,
                      } as SenzorStockItem);
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
                      setEditItem({
                        ...editItem,
                        dev_eui: e.target.value,
                      })
                    }
                    placeholder="Main Warehouse"
                  />
                </>
              ) : (
                <>
                  <Select
                    value={(editItem as ComponentStockItem)?.componentId || ""}
                    onChange={(e) => {
                      const componentId = Number(e.target.value);
                      const selectedComponent = componentOptions.find(
                        (c) => c.id === componentId,
                      );
                      if (selectedComponent) {
                        setEditItem({
                          ...editItem,
                          componentId: selectedComponent.id,
                          name: selectedComponent.name,
                        } as ComponentStockItem);
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
                      setEditItem({
                        ...editItem,
                        contactDetails: {
                          ...(editItem as ComponentStockItem).contactDetails,
                          supplier: e.target.value,
                        },
                      } as ComponentStockItem);
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
                      (editItem as ComponentStockItem)?.contactDetails?.email ||
                      ""
                    }
                    onChange={(e) => {
                      if (!editItem) return;
                      setEditItem({
                        ...editItem,
                        contactDetails: {
                          ...(editItem as ComponentStockItem).contactDetails,
                          email: e.target.value,
                        },
                      } as ComponentStockItem);
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
                      (editItem as ComponentStockItem)?.contactDetails?.phone ||
                      ""
                    }
                    onChange={(e) => {
                      if (!editItem) return;
                      setEditItem({
                        ...editItem,
                        contactDetails: {
                          ...(editItem as ComponentStockItem).contactDetails,
                          phone: e.target.value,
                        },
                      } as ComponentStockItem);
                    }}
                  />

                  <TextField
                    margin="dense"
                    id="price"
                    label="Price per Item (€)"
                    type="number"
                    fullWidth
                    variant="outlined"
                    value={(editItem as ComponentStockItem)?.price || ""}
                    onChange={(e) => {
                      if (!editItem) return;
                      setEditItem({
                        ...editItem,
                        price: parseFloat(e.target.value) || 0,
                      } as ComponentStockItem);
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
                value={editItem?.quantity || 1}
                onChange={(e) =>
                  editItem &&
                  setEditItem({
                    ...editItem,
                    quantity: Math.max(1, parseInt(e.target.value) || 1),
                  })
                }
                className="mt-4 mb-4"
                inputProps={{ min: 1 }}
              />
            </div>

            {activeTab === 1 && (
              <div className="border-l pl-4">
                <Typography variant="h6" className="mb-3">
                  Assign to Sensors
                </Typography>
                <Typography
                  variant="body2"
                  color="textSecondary"
                  className="mb-4"
                >
                  Specify how many of this component are needed for each sensor
                </Typography>

                <div className="mb-6">
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
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
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
                </div>

                <div className="mb-6 max-h-48 overflow-y-auto">
                  {sensorOptions
                    .filter((option) => option.selected)
                    .map((option) => (
                      <div
                        key={option.id}
                        className="mb-3 flex items-center justify-between rounded bg-gray-50 p-2"
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
                          className="w-24"
                          inputProps={{ min: 1 }}
                        />
                      </div>
                    ))}
                </div>

                <Typography variant="h6" className="mb-3">
                  Invoice Information
                </Typography>

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
                  <div className="mb-4 rounded border bg-gray-50 p-3">
                    <Typography variant="body2" className="mb-1">
                      <strong>Selected file:</strong> {invoiceFile.name}
                    </Typography>
                    <Typography variant="body2" color="primary">
                      <strong>Will be saved as:</strong> {invoiceNumber}.
                      {invoiceFile.name.split(".").pop()}
                    </Typography>
                  </div>
                )}

                <div
                  className={`cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
                    isDragging
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-300 hover:border-gray-400"
                  }`}
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
                </div>
              </div>
            )}
          </div>
        </DialogContent>
        <DialogActions>
          <Button color="error" variant="contained" onClick={handleDeleteItem}>
            Delete Item
          </Button>
          <Button onClick={handleClose}>Cancel</Button>
          <Button
            onClick={
              activeTab === 0
                ? handleAddOrUpdateSensor
                : handleAddOrUpdateComponent
            }
            disabled={uploading}
          >
            {uploading
              ? "Uploading..."
              : `${editItem?.id ? "Update" : "Add"} Item`}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Are you sure you want to delete this item?</DialogTitle>
        <DialogContent>
          <Typography color="error">This action cannot be undone!</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={handleDeleteItem}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={adjustmentDialogOpen}
        onClose={() => setAdjustmentDialogOpen(false)}
      >
        <DialogTitle>
          {adjustmentType === "increase"
            ? "Increase Quantity"
            : "Decrease Quantity"}
        </DialogTitle>
        <DialogContent>
          {currentAdjustItem && (
            <div className="mb-4">
              <Typography variant="h6">
                {"sensorName" in currentAdjustItem
                  ? currentAdjustItem.sensorName
                  : currentAdjustItem.name}
              </Typography>
              <Typography>
                Current Quantity: {currentAdjustItem.quantity}
              </Typography>
            </div>
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
              setAdjustmentQuantity(Math.max(1, parseInt(e.target.value) || 1))
            }
            inputProps={{ min: 1 }}
            className="mb-4"
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
            onChange={(e) => setAdjustmentReason(e.target.value)}
            required
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
              value={device_eui}
              onChange={(e) => set_device_eui(e.target.value)}
              required
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
                  className="mb-4"
                  required
                />
              </>
            )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAdjustmentDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={confirmAdjustment}
            disabled={
              !adjustmentReason ||
              (adjustmentType === "increase" &&
                "componentId" in (currentAdjustItem ?? {}) &&
                !invoiceNumber)
            }
          >
            Confirm
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
    </ThemeProvider>
  );
}
