"use client";

import { useEffect, useState } from "react";
import type { Order as PrismaOrder, OrderItem as PrismaOrderItem } from "@prisma/client";

// Define the extended types based on what we get from the database
type OrderItem = PrismaOrderItem & {
  sensor: {
    id: number;
    sensorName: string;
  };
};

type Order = PrismaOrder & {
  items: OrderItem[];
};

// Form-specific types for the UI
type FormOrderItem = {
  sensorId: number;
  quantity: number;
};

type FormOrder = {
  orderName: string;
  customerName: string;
  shippingAddress: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
  items: FormOrderItem[];
  frequency: string;
  date: string;
  description: string;
  shippingCost: number;
  priority: string;
};
import { AnimatePresence, motion } from "framer-motion";
import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Modal,
  Paper,
  Select,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import VisibilityIcon from "@mui/icons-material/Visibility";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ReceiptIcon from "@mui/icons-material/Receipt";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DeleteOrderFromDB, GetOrdersFromDB, UpsertOrderInDB } from "./order";
import { checkSensorProductionCapability, getAvailableFinishedSensors, getSensors } from "../../inventory/components/backent";

// Sensor options for dropdown - will be loaded from database
const SENSOR_OPTIONS = [
  { id: 1, name: "Temperature Sensor" },
  { id: 2, name: "Humidity Sensor" },
  { id: 3, name: "Motion Sensor" },
  { id: 4, name: "Pressure Sensor" },
];

// Frequency options for dropdown
const FREQUENCY_OPTIONS = ["433 MHz", "EU868", "US915", "2.4 GHz"];

// Priority options
const PRIORITY_OPTIONS = ["Urgent", "Medium", "Low"];

// Status options
type OrderStatus = "Pending" | "Taken" | "Shipped" | "Arrived";

// Default sensor prices for cost calculation
const DEFAULT_SENSOR_PRICES: Record<number, number> = {
  1: 12.99,
  2: 9.99,
  3: 14.99,
  4: 19.99,
};

export default function OrderManagement() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const queryClient = useQueryClient();

  // Fetch orders from database
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: GetOrdersFromDB,
  });

  // Fetch sensors from database
  const { data: sensors = [] } = useQuery({
    queryKey: ['sensors'],
    queryFn: getSensors,
  });

  // Mutations
  const upsertOrderMutation = useMutation({
    mutationFn: UpsertOrderInDB,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setSnackbar({
        open: true,
        message: "Order saved successfully!",
        severity: "success",
      });
    },
    onError: (error) => {
      setSnackbar({
        open: true,
        message: `Error saving order: ${error.message}`,
        severity: "error",
      });
    }
  });

  const deleteOrderMutation = useMutation({
    mutationFn: DeleteOrderFromDB,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setSnackbar({
        open: true,
        message: "Order deleted successfully!",
        severity: "success",
      });
    },
    onError: (error) => {
      setSnackbar({
        open: true,
        message: `Error deleting order: ${error.message}`,
        severity: "error",
      });
    }
  });

  const [open, setOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error",
  });
  const [descriptionModalOpen, setDescriptionModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);

  // Stock validation state
  const [stockValidation, setStockValidation] = useState<{
    isValid: boolean;
    warnings: Array<{
      sensorId: number;
      sensorName: string;
      requestedQuantity: number;
      canProduce: boolean;
      maxPossible: number;
      issues: string[];
    }>;
  }>({ isValid: true, warnings: [] });
  const [showStockWarning, setShowStockWarning] = useState(false);
  const [proceedWithOrder, setProceedWithOrder] = useState(false);

  // Form state for creating/editing orders
  const [formState, setFormState] = useState<FormOrder>({
    orderName: "",
    customerName: "",
    shippingAddress: {
      street: "",
      city: "",
      postalCode: "",
      country: "Slovenia",
    },
    items: [{ sensorId: 1, quantity: 1 }],
    frequency: FREQUENCY_OPTIONS[0] || "EU868",
    date: new Date().toISOString().split("T")[0] || "",
    description: "",
    shippingCost: 0,
    priority: "Medium",
  });

  useEffect(() => {
    if (editingOrder) {
      setFormState({
        orderName: editingOrder.orderName || "",
        customerName: editingOrder.customerName || "",
        shippingAddress: {
          street: editingOrder.street || "",
          city: editingOrder.city || "",
          postalCode: editingOrder.postalCode || "",
          country: editingOrder.country || "Slovenia",
        },
        items: editingOrder.items.map(item => ({ sensorId: item.sensorId, quantity: item.quantity })) || [{ sensorId: 1, quantity: 1 }],
        frequency: editingOrder.frequency || FREQUENCY_OPTIONS[0] || "EU868",
        date: editingOrder.date || new Date().toISOString().split("T")[0] || "",
        description: editingOrder.description || "",
        shippingCost: editingOrder.shippingCost || 0,
        priority: editingOrder.priority || "Medium",
      });
    }
  }, [editingOrder]);

  const handleClickOpen = () => {
    setEditingOrder(null);
    setFormState({
      orderName: "",
      customerName: "",
      shippingAddress: {
        street: "",
        city: "",
        postalCode: "",
        country: "Slovenia",
      },
      items: [{ sensorId: 1, quantity: 1 }],
      frequency: FREQUENCY_OPTIONS[0] || "EU868",
      date: new Date().toISOString().split("T")[0] || "",
      description: "",
      shippingCost: 0,
      priority: "Medium",
    });
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingOrder(null);
    setStockValidation({ isValid: true, warnings: [] });
    setShowStockWarning(false);
    setProceedWithOrder(false);
    setItemStockStatus({});
  };

  // Single item stock validation
  const [itemStockStatus, setItemStockStatus] = useState<Record<number, {
    loading: boolean;
    canProduce: boolean;
    maxPossible: number;
    issues: string[];
  }>>({});

  const checkSingleItemStock = async (sensorId: number, quantity: number, itemIndex: number) => {
    setItemStockStatus(prev => ({
      ...prev,
      [itemIndex]: { loading: true, canProduce: false, maxPossible: 0, issues: [] }
    }));

    try {
      // Check both finished sensors and production capability
      const [finishedSensors, productionResult] = await Promise.all([
        getAvailableFinishedSensors(sensorId),
        checkSensorProductionCapability(sensorId, 1)
      ]);

      // Calculate total availability
      const totalAvailable = finishedSensors.availableCount + productionResult.maxPossibleProduction;
      const canFulfillRequest = totalAvailable >= quantity;
      const issues: string[] = [];

      if (!canFulfillRequest) {
        if (totalAvailable === 0) {
          issues.push("No finished sensors and cannot produce any with current components");
        } else {
          issues.push(`Total available: ${totalAvailable} (${finishedSensors.availableCount} finished + ${productionResult.maxPossibleProduction} can produce), requested: ${quantity}`);
        }
      } else if (finishedSensors.availableCount < quantity) {
        const needToProduce = quantity - finishedSensors.availableCount;
        issues.push(`✓ Available: ${finishedSensors.availableCount} finished + ${needToProduce} to manufacture`);
      } else {
        issues.push(`✓ ${finishedSensors.availableCount} finished sensors available`);
      }

      setItemStockStatus(prev => ({
        ...prev,
        [itemIndex]: {
          loading: false,
          canProduce: canFulfillRequest,
          maxPossible: totalAvailable,
          issues
        }
      }));
    } catch (error) {
      console.error('Error checking stock:', error);
      setItemStockStatus(prev => ({
        ...prev,
        [itemIndex]: {
          loading: false,
          canProduce: false,
          maxPossible: 0,
          issues: ['Error checking stock']
        }
      }));
    }
  };
  const validateStock = async (items: FormOrderItem[]): Promise<{
    isValid: boolean;
    warnings: Array<{
      sensorId: number;
      sensorName: string;
      requestedQuantity: number;
      canProduce: boolean;
      maxPossible: number;
      issues: string[];
    }>;
  }> => {
    const warnings = [];
    let isValid = true;

    for (const item of items) {
      try {
        // First check if we have finished sensors available
        const finishedSensors = await getAvailableFinishedSensors(item.sensorId);

        // Then check production capability for manufacturing more
        const productionCapability = await checkSensorProductionCapability(
          item.sensorId,
          1
        );

        const issues: string[] = [];
        let canFulfillOrder = false;
        const totalAvailable = finishedSensors.availableCount + productionCapability.maxPossibleProduction;

        // Check if we can fulfill the order with existing stock + production
        if (finishedSensors.availableCount >= item.quantity) {
          // We have enough finished sensors
          canFulfillOrder = true;
        } else if (totalAvailable >= item.quantity) {
          // We can fulfill with finished sensors + production
          canFulfillOrder = true;
          const needToProduce = item.quantity - finishedSensors.availableCount;
          issues.push(`Need to produce ${needToProduce} additional sensors (${finishedSensors.availableCount} finished + ${needToProduce} to manufacture)`);
        } else {
          // Cannot fulfill the order
          isValid = false;
          canFulfillOrder = false;

          if (finishedSensors.availableCount === 0 && productionCapability.maxPossibleProduction === 0) {
            issues.push("No finished sensors available and cannot produce any with current components");
          } else {
            issues.push(`Total available: ${totalAvailable} (${finishedSensors.availableCount} finished + ${productionCapability.maxPossibleProduction} can produce), requested: ${item.quantity}`);
          }

          // Add specific component issues if production is limited
          if (productionCapability.maxPossibleProduction < item.quantity - finishedSensors.availableCount) {
            productionCapability.componentStatus.forEach(comp => {
              if (!comp.sufficient) {
                issues.push(
                  `${comp.componentName}: need ${comp.requiredPerSensor * item.quantity}, have ${comp.available}`
                );
              }
            });
          }
        }

        if (issues.length > 0) {
          warnings.push({
            sensorId: item.sensorId,
            sensorName: productionCapability.sensorName,
            requestedQuantity: item.quantity,
            canProduce: canFulfillOrder,
            maxPossible: totalAvailable,
            issues,
          });
        }
      } catch (error) {
        console.error(`Error checking stock for sensor ${item.sensorId}:`, error);
        isValid = false;
        warnings.push({
          sensorId: item.sensorId,
          sensorName: `Sensor ${item.sensorId}`,
          requestedQuantity: item.quantity,
          canProduce: false,
          maxPossible: 0,
          issues: ["Error checking stock availability"],
        });
      }
    }

    return { isValid, warnings };
  };

  const handleCreateOrUpdateOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    // If this is a new order (not editing), validate stock
    if (!editingOrder && !proceedWithOrder) {
      const validation = await validateStock(formState.items);
      setStockValidation(validation);

      if (!validation.isValid || validation.warnings.length > 0) {
        setShowStockWarning(true);
        return;
      }
    }

    // Proceed with order creation/update
    const orderData = {
      id: editingOrder?.id,
      orderName: formState.orderName,
      customerName: formState.customerName,
      shippingAddress: formState.shippingAddress,
      items: formState.items,
      frequency: formState.frequency,
      date: formState.date,
      description: formState.description,
      status: editingOrder ? editingOrder.status : "Pending",
      shippingCost: formState.shippingCost,
      priority: formState.priority,
    };

    upsertOrderMutation.mutate(orderData);
    handleClose();
  };

  const handleProceedWithOrder = () => {
    setProceedWithOrder(true);
    setShowStockWarning(false);
    // Re-trigger form submission
    const form = document.querySelector('form');
    if (form) {
      form.requestSubmit();
    }
  };

  const handleDeleteOrder = (id: number) => {
    deleteOrderMutation.mutate(id);
  };

  const handleEditOrder = (order: Order) => {
    setEditingOrder(order);
    setOpen(true);
  };

  const handleStatusChange = (id: number, newStatus: OrderStatus) => {
    const order = orders.find(o => o.id === id);
    if (order) {
      const updatedOrder = { ...order, status: newStatus };
      upsertOrderMutation.mutate(updatedOrder);

      let message = "";
      switch (newStatus) {
        case "Taken":
          message = "Order taken successfully!";
          break;
        case "Shipped":
          message = "Order shipped successfully!";
          break;
        case "Arrived":
          message = "Order marked as arrived!";
          break;
        default:
          message = "Order status updated!";
      }

      setSnackbar({
        open: true,
        message,
        severity: "success",
      });
    }
  };

  const handleOpenDescription = (order: Order) => {
    setSelectedOrder(order);
    setDescriptionModalOpen(true);
  };

  const handleOpenReceipt = (order: Order) => {
    setSelectedOrder(order);
    setReceiptModalOpen(true);
  };

  const handleCopyAddress = (order: Order) => {
    const addressText = `${order.street}, ${order.postalCode} ${order.city}, ${order.country}`;
    navigator.clipboard.writeText(addressText);
    setSnackbar({
      open: true,
      message: "Address copied to clipboard!",
      severity: "success",
    });
  };

  // Form handlers
  const handleAddItem = () => {
    setFormState({
      ...formState,
      items: [...formState.items, { sensorId: 1, quantity: 1 }],
    });
  };

  const handleRemoveItem = (index: number) => {
    if (formState.items.length <= 1) return;
    const newItems = [...formState.items];
    newItems.splice(index, 1);
    setFormState({ ...formState, items: newItems });
  };

  const handleItemChange = (
    index: number,
    field: keyof FormOrderItem,
    value: string | number
  ) => {
    const newItems = [...formState.items];
    if (newItems[index]) {
      newItems[index] = {
        sensorId: field === "sensorId" ? Number(value) : newItems[index].sensorId,
        quantity: field === "quantity" ? Number(value) : newItems[index].quantity,
      };
      setFormState({ ...formState, items: newItems });
    }
  };

  const handleAddressChange = (field: keyof FormOrder["shippingAddress"], value: string) => {
    setFormState({
      ...formState,
      shippingAddress: {
        ...formState.shippingAddress,
        [field]: value,
      },
    });
  };

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case "Pending":
        return "warning";
      case "Taken":
        return "info";
      case "Shipped":
        return "secondary";
      case "Arrived":
        return "success";
      default:
        return "default";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "Urgent":
        return "#ff5252"; // red
      case "Medium":
        return "#ffb74d"; // yellow/orange
      case "Low":
        return "#4caf50"; // green
      default:
        return "#e0e0e0"; // default gray
    }
  };

  const getStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case "Taken":
        return <AssignmentTurnedInIcon />;
      case "Shipped":
        return <LocalShippingIcon />;
      case "Arrived":
        return <CheckCircleIcon />;
      default:
        return undefined;
    }
  };

  const calculateTotalCost = (order: Order) => {
    const itemsCost = order.items.reduce(
      (sum, item) => sum + (DEFAULT_SENSOR_PRICES[item.sensorId] || 0) * item.quantity,
      0
    );

    return itemsCost + order.shippingCost;
  };

  if (isLoading) {
    return (
      <Container maxWidth="xl" sx={{ py: { xs: 2, md: 4 }, display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <Typography variant="h6">Loading orders...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 2, md: 4 } }}>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Box sx={{ mb: { xs: 3, md: 4 } }}>
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", md: "row" },
              alignItems: { xs: "stretch", md: "center" },
              justifyContent: "space-between",
              gap: { xs: 2, md: 0 },
            }}
          >
            <Typography
              variant={isMobile ? "h4" : "h3"}
              component="h1"
              sx={{
                fontWeight: 700,
                color: "primary.main",
                textAlign: { xs: "center", md: "left" },
              }}
            >
              Order Management
            </Typography>
            <Button
              variant="contained"
              onClick={handleClickOpen}
              size={isMobile ? "large" : "medium"}
              sx={{
                fontWeight: 600,
                minWidth: { xs: "100%", md: "auto" },
              }}
            >
              Create New Order
            </Button>
          </Box>
        </Box>

        <TableContainer
          component={Paper}
          elevation={3}
          sx={{
            borderRadius: 2,
            overflow: "hidden",
            "& .MuiTable-root": {
              minWidth: { xs: 600, md: "auto" },
            },
          }}
        >
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 10 }}>Priority</TableCell>
                <TableCell>ID</TableCell>
                <TableCell>Order Name</TableCell>
                <TableCell>Customer</TableCell>
                <TableCell>Shipping Address</TableCell>
                <TableCell>Items</TableCell>
                <TableCell>Frequency</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Shipping Cost</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <AnimatePresence>
                {orders.map((order, index) => (
                  <motion.tr
                    key={order.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                  >
                    <TableCell>
                      <Box
                        sx={{
                          width: 10,
                          height: 40,
                          backgroundColor: getPriorityColor(order.priority),
                          borderRadius: 1,
                        }}
                      />
                    </TableCell>
                    <TableCell>{order.id}</TableCell>
                    <TableCell>{order.orderName}</TableCell>
                    <TableCell>{order.customerName}</TableCell>
                    <TableCell>
                      <Box sx={{ display: "flex", flexDirection: "column" }}>
                        <Typography variant="body2">
                          {order.street}
                        </Typography>
                        <Typography variant="body2">
                          {order.postalCode}{" "}
                          {order.city}
                        </Typography>
                        <Typography variant="body2">
                          {order.country}
                        </Typography>
                        <Button
                          size="small"
                          startIcon={<ContentCopyIcon />}
                          onClick={() => handleCopyAddress(order)}
                          sx={{ mt: 0.5 }}
                        >
                          Copy
                        </Button>
                      </Box>
                    </TableCell>
                    <TableCell>
                      {order.items.map((item, idx) => (
                        <div key={idx}>
                          {item.sensor?.sensorName || `Sensor ${item.sensorId}`}{" "}
                          (x{item.quantity})
                        </div>
                      ))}
                    </TableCell>
                    <TableCell>{order.frequency}</TableCell>
                    <TableCell>{order.date}</TableCell>
                    <TableCell>${order.shippingCost.toFixed(2)}</TableCell>
                    <TableCell>
                      <Chip
                        label={order.status}
                        color={getStatusColor(order.status)}
                        icon={getStatusIcon(order.status)}
                      />
                    </TableCell>
                    <TableCell>
                      <IconButton
                        color="primary"
                        onClick={() => handleEditOrder(order)}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        color="error"
                        onClick={() => handleDeleteOrder(order.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                      <IconButton
                        color="info"
                        onClick={() => handleOpenDescription(order)}
                      >
                        <VisibilityIcon />
                      </IconButton>
                      <IconButton
                        color="success"
                        onClick={() => handleOpenReceipt(order)}
                      >
                        <ReceiptIcon />
                      </IconButton>

                      {order.status === "Pending" && (
                        <IconButton
                          color="info"
                          onClick={() => handleStatusChange(order.id, "Taken")}
                          title="Take Order"
                        >
                          <AssignmentTurnedInIcon />
                        </IconButton>
                      )}

                      {order.status === "Taken" && (
                        <IconButton
                          color="secondary"
                          onClick={() => handleStatusChange(order.id, "Shipped")}
                          title="Mark as Shipped"
                        >
                          <LocalShippingIcon />
                        </IconButton>
                      )}

                      {order.status === "Shipped" && (
                        <IconButton
                          color="success"
                          onClick={() => handleStatusChange(order.id, "Arrived")}
                          title="Mark as Arrived"
                        >
                          <CheckCircleIcon />
                        </IconButton>
                      )}
                    </TableCell>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </TableBody>
          </Table>
        </TableContainer>
      </motion.div>

      {/* Order Form Dialog */}
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingOrder ? "Edit Order" : "Create New Order"}
        </DialogTitle>
        <DialogContent>
          <Box
            component="form"
            onSubmit={handleCreateOrUpdateOrder}
            sx={{ mt: 2 }}
          >
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Order Name"
                  value={formState.orderName}
                  onChange={(e) =>
                    setFormState({ ...formState, orderName: e.target.value })
                  }
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Full Name"
                  placeholder="Person or company"
                  value={formState.customerName}
                  onChange={(e) =>
                    setFormState({ ...formState, customerName: e.target.value })
                  }
                  required
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Priority</InputLabel>
                  <Select
                    value={formState.priority}
                    label="Priority"
                    onChange={(e) =>
                      setFormState({ ...formState, priority: e.target.value })
                    }
                    required
                  >
                    {PRIORITY_OPTIONS.map((priority) => (
                      <MenuItem key={priority} value={priority}>
                        {priority}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Shipping Address
                </Typography>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Address"
                  placeholder="Search streets, businesses or places"
                  value={formState.shippingAddress.street}
                  onChange={(e) => handleAddressChange("street", e.target.value)}
                  required
                />
              </Grid>

              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Region</InputLabel>
                  <Select
                    value={formState.shippingAddress.country}
                    label="Region"
                    onChange={(e) =>
                      handleAddressChange("country", e.target.value)
                    }
                    required
                  >
                    <MenuItem value="Slovenia">Slovenia</MenuItem>
                    <MenuItem value="Croatia">Croatia</MenuItem>
                    <MenuItem value="Austria">Austria</MenuItem>
                    <MenuItem value="Italy">Italy</MenuItem>
                    <MenuItem value="Germany">Germany</MenuItem>
                    <MenuItem value="France">France</MenuItem>
                    <MenuItem value="Other EU">Other EU</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Eircode"
                    value={formState.shippingAddress.postalCode}
                    onChange={(e) =>
                      handleAddressChange("postalCode", e.target.value)
                    }
                    required
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="City"
                    value={formState.shippingAddress.city}
                    onChange={(e) => handleAddressChange("city", e.target.value)}
                    required
                  />
                </Grid>
                <Grid item xs={12}>
                  <Button variant="outlined" fullWidth>
                    Search for address
                  </Button>
                </Grid>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Order Items
                </Typography>

                {formState.items.map((item, index) => (
                  <Grid
                    container
                    spacing={2}
                    key={index}
                    alignItems="center"
                    sx={{ mb: 2 }}
                  >
                    <Grid item xs={5}>
                      <FormControl fullWidth>
                        <InputLabel>Sensor</InputLabel>
                        <Select
                          value={item.sensorId}
                          label="Sensor"
                          onChange={(e) =>
                            handleItemChange(
                              index,
                              "sensorId",
                              Number(e.target.value)
                            )
                          }
                          required
                        >
                          {sensors.map((sensor) => (
                            <MenuItem key={sensor.id} value={sensor.id}>
                              {sensor.sensorName}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>

                    {/* Combined Quantity and Price fields */}
                    <Grid item xs={3}>
                      <TextField
                        fullWidth
                        label="Quantity"
                        type="number"
                        value={item.quantity}
                        onChange={(e) =>
                          handleItemChange(
                            index,
                            "quantity",
                            Number(e.target.value)
                          )
                        }
                        required
                        inputProps={{ min: 1 }}
                      />
                    </Grid>

                    <Grid item xs={2}>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => checkSingleItemStock(item.sensorId, item.quantity, index)}
                        disabled={itemStockStatus[index]?.loading}
                        sx={{ height: '56px' }}
                      >
                        {itemStockStatus[index]?.loading ? "..." : "Check Stock"}
                      </Button>
                    </Grid>

                    <Grid item xs={2}>
                      <Button
                        variant="outlined"
                        color="error"
                        onClick={() => handleRemoveItem(index)}
                        disabled={formState.items.length <= 1}
                        sx={{ height: '56px' }}
                      >
                        Remove
                      </Button>
                    </Grid>

                    {/* Stock Status Indicator */}
                    {itemStockStatus[index] && !itemStockStatus[index].loading && (
                      <Grid item xs={12}>
                        <Box sx={{
                          p: 1,
                          bgcolor: itemStockStatus[index].canProduce ? 'success.light' : 'error.light',
                          borderRadius: 1,
                          mt: 1
                        }}>
                          <Typography variant="body2" color={itemStockStatus[index].canProduce ? 'success.dark' : 'error.dark'}>
                            {itemStockStatus[index].canProduce
                              ? `✓ Can produce ${item.quantity} sensors (Max: ${itemStockStatus[index].maxPossible})`
                              : `⚠ Cannot produce ${item.quantity} sensors (Max: ${itemStockStatus[index].maxPossible})`
                            }
                          </Typography>
                          {itemStockStatus[index].issues.length > 0 && (
                            <Typography variant="caption" display="block">
                              {itemStockStatus[index].issues.join(', ')}
                            </Typography>
                          )}
                        </Box>
                      </Grid>
                    )}
                  </Grid>
                ))}

                <Button
                  variant="outlined"
                  onClick={handleAddItem}
                  sx={{ mt: 1 }}
                >
                  Add Item
                </Button>
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Frequency</InputLabel>
                  <Select
                    value={formState.frequency}
                    label="Frequency"
                    onChange={(e) =>
                      setFormState({ ...formState, frequency: e.target.value })
                    }
                    required
                  >
                    {FREQUENCY_OPTIONS.map((freq) => (
                      <MenuItem key={freq} value={freq}>
                        {freq}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Shipping Cost ($)"
                  type="number"
                  value={formState.shippingCost}
                  onChange={(e) =>
                    setFormState({
                      ...formState,
                      shippingCost: Number(e.target.value),
                    })
                  }
                  required
                  inputProps={{ min: 0, step: 0.01 }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="date"
                  label="Order Date"
                  value={formState.date}
                  onChange={(e) =>
                    setFormState({ ...formState, date: e.target.value })
                  }
                  InputLabelProps={{ shrink: true }}
                  required
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Order Description"
                  multiline
                  rows={3}
                  value={formState.description}
                  onChange={(e) =>
                    setFormState({ ...formState, description: e.target.value })
                  }
                />
              </Grid>

              <Grid item xs={12}>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  sx={{ fontWeight: 600, mr: 2 }}
                  disabled={upsertOrderMutation.isPending}
                >
                  {editingOrder ? "Update Order" : "Create Order"}
                </Button>
                <Button variant="outlined" onClick={handleClose}>
                  Cancel
                </Button>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
      </Dialog>

      {/* Description Modal */}
      <Modal
        open={descriptionModalOpen}
        onClose={() => setDescriptionModalOpen(false)}
        aria-labelledby="description-modal-title"
        aria-describedby="description-modal-description"
      >
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: { xs: "90%", md: 500 },
            bgcolor: "background.paper",
            borderRadius: 2,
            boxShadow: 24,
            p: 4,
          }}
        >
          <Typography
            id="description-modal-title"
            variant="h6"
            component="h2"
            gutterBottom
          >
            Order Description
          </Typography>
          <Typography id="description-modal-description" sx={{ mt: 2 }}>
            {selectedOrder?.description || "No description available"}
          </Typography>
        </Box>
      </Modal>

      {/* Receipt Modal */}
      <Modal
        open={receiptModalOpen}
        onClose={() => setReceiptModalOpen(false)}
        aria-labelledby="receipt-modal-title"
        aria-describedby="receipt-modal-description"
      >
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: { xs: "90%", md: 500 },
            bgcolor: "background.paper",
            borderRadius: 2,
            boxShadow: 24,
            p: 4,
          }}
        >
          {selectedOrder && (
            <>
              <Typography
                variant="h5"
                component="h2"
                gutterBottom
                sx={{ textAlign: "center" }}
              >
                Order Receipt
              </Typography>

              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
                  {selectedOrder.orderName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Order ID: {selectedOrder.id}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Date: {selectedOrder.date}
                </Typography>
              </Box>

              <Box sx={{ my: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: "bold" }}>
                  Customer:
                </Typography>
                <Typography variant="body2">
                  {selectedOrder.customerName}
                </Typography>
                <Typography variant="body2">
                  {selectedOrder.street}
                </Typography>
                <Typography variant="body2">
                  {selectedOrder.postalCode}{" "}
                  {selectedOrder.city}
                </Typography>
                <Typography variant="body2">
                  {selectedOrder.country}
                </Typography>
              </Box>

              <Box sx={{ my: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: "bold" }}>
                  Order Details:
                </Typography>
                <Typography variant="body2">
                  Frequency: {selectedOrder.frequency}
                </Typography>
                <Typography variant="body2">
                  Priority:{" "}
                  <Box
                    component="span"
                    sx={{
                      display: "inline-block",
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      backgroundColor: getPriorityColor(selectedOrder.priority),
                      ml: 1,
                      mr: 1,
                    }}
                  />
                  {selectedOrder.priority}
                </Typography>
                <Typography variant="body2">
                  Status:{" "}
                  <Chip
                    label={selectedOrder.status}
                    size="small"
                    color={getStatusColor(selectedOrder.status)}
                    sx={{ ml: 1 }}
                  />
                </Typography>
              </Box>

              <Box sx={{ my: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: "bold" }}>
                  Items:
                </Typography>
                {selectedOrder.items.map((item, index) => (
                  <Box
                    key={index}
                    sx={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <Typography variant="body2">
                      {SENSOR_OPTIONS.find((s) => s.id === item.sensorId)
                        ?.name || `Sensor ${item.sensorId}`}{" "}
                      (x{item.quantity})
                    </Typography>
                    <Typography variant="body2">
                      $
                      {(
                        (DEFAULT_SENSOR_PRICES[item.sensorId] || 0) *
                        item.quantity
                      ).toFixed(2)}
                    </Typography>
                  </Box>
                ))}
              </Box>

              <Box sx={{ my: 2, borderTop: "1px solid #ddd", pt: 2 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography variant="body2">Shipping Cost:</Typography>
                  <Typography variant="body2">
                    ${selectedOrder.shippingCost.toFixed(2)}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    mt: 1,
                  }}
                >
                  <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
                    Total:
                  </Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
                    ${calculateTotalCost(selectedOrder).toFixed(2)}
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ mt: 3, display: "flex", justifyContent: "center" }}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => window.print()}
                  startIcon={<ReceiptIcon />}
                >
                  Print Receipt
                </Button>
              </Box>
            </>
          )}
        </Box>
      </Modal>

      {/* Stock Warning Dialog */}
      <Dialog
        open={showStockWarning}
        onClose={() => setShowStockWarning(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ bgcolor: "warning.light", color: "warning.contrastText" }}>
          ⚠️ Stock Availability Warning
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Typography variant="body1" gutterBottom>
            {stockValidation.isValid
              ? "Some items in this order may have limited availability:"
              : "This order cannot be fulfilled with current stock levels:"}
          </Typography>

          {stockValidation.warnings.map((warning, index) => (
            <Box key={index} sx={{ mt: 2, p: 2, bgcolor: "grey.100", borderRadius: 1 }}>
              <Typography variant="subtitle1" fontWeight="bold">
                {warning.sensorName} (Requested: {warning.requestedQuantity})
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Maximum possible: {warning.maxPossible} sensors
              </Typography>

              {warning.issues.map((issue, issueIndex) => (
                <Typography key={issueIndex} variant="body2" color="error" sx={{ ml: 2 }}>
                  • {issue}
                </Typography>
              ))}
            </Box>
          ))}

          <Typography variant="body2" sx={{ mt: 3, fontStyle: "italic" }}>
            {stockValidation.isValid
              ? "You can proceed with this order, but some items may need to be manufactured or may have delivery delays."
              : "If you proceed with this order, you will not be able to fulfill it until more stock is available."}
          </Typography>
        </DialogContent>
        <Box sx={{ p: 2, display: "flex", gap: 2, justifyContent: "flex-end" }}>
          <Button
            variant="outlined"
            onClick={() => setShowStockWarning(false)}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color={stockValidation.isValid ? "warning" : "error"}
            onClick={handleProceedWithOrder}
          >
            {stockValidation.isValid
              ? "Proceed Anyway"
              : "Create Order Despite Issues"}
          </Button>
        </Box>
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
    </Container >
  );
}

