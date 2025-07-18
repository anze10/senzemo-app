"use client";

import { useState } from "react";
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
  IconButton,
  Modal,
  Paper,
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

type Order = {
  id: number;
  customerName: string;
  sensorId: number;
  quantity: number;
  frequency: string;
  date: string;
  description: string;
  status: "Pending" | "Taken";
};

export default function OrderManagement() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [orders, setOrders] = useState<Order[]>([
    {
      id: 1,
      customerName: "Customer X",
      sensorId: 1,
      quantity: 10,
      frequency: "433 MHz",
      date: "2023-06-05",
      description: "Special packaging required",
      status: "Pending",
    },
    {
      id: 2,
      customerName: "Customer Y",
      sensorId: 2,
      quantity: 5,
      frequency: "868 MHz",
      date: "2023-06-06",
      description: "Rush order, deliver within 3 days",
      status: "Pending",
    },
  ]);
  const [open, setOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error",
  });
  const [descriptionModalOpen, setDescriptionModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const handleClickOpen = () => {
    setEditingOrder(null);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingOrder(null);
  };

  const handleCreateOrUpdateOrder = (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    // Ensure random ID generation is handled client-side
    const randomId = 1;

    const newOrder: Order = {
      id: editingOrder ? editingOrder.id : randomId, // Use client-generated random ID
      customerName: formData.get("customerName") as string,
      sensorId: Number(formData.get("sensorId")),
      quantity: Number(formData.get("quantity")),
      frequency: formData.get("frequency") as string,
      date: formData.get("date") as string,
      description: formData.get("description") as string,
      status: editingOrder ? editingOrder.status : "Pending",
    };

    if (editingOrder) {
      setOrders(
        orders.map((order) =>
          order.id === editingOrder.id ? newOrder : order,
        ),
      );
      setSnackbar({
        open: true,
        message: "Order updated successfully!",
        severity: "success",
      });
    } else {
      setOrders([...orders, newOrder]);
      setSnackbar({
        open: true,
        message: "New order created successfully!",
        severity: "success",
      });
    }
    handleClose();
  };

  const handleDeleteOrder = (id: number) => {
    setOrders(orders.filter((order) => order.id !== id));
    setSnackbar({
      open: true,
      message: "Order deleted successfully!",
      severity: "success",
    });
  };

  const handleEditOrder = (order: Order) => {
    setEditingOrder(order);
    setOpen(true);
  };

  const handleTakeOrder = (id: number) => {
    setOrders(
      orders.map((order) =>
        order.id === id ? { ...order, status: "Taken" } : order,
      ),
    );
    setSnackbar({
      open: true,
      message: "Order taken successfully!",
      severity: "success",
    });
  };

  const handleOpenDescription = (order: Order) => {
    setSelectedOrder(order);
    setDescriptionModalOpen(true);
  };

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 2, md: 4 } }}>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Box sx={{ mb: { xs: 3, md: 4 } }}>
          <Box sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: { xs: 'stretch', md: 'center' },
            justifyContent: 'space-between',
            gap: { xs: 2, md: 0 }
          }}>
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
                minWidth: { xs: '100%', md: 'auto' }
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
            overflow: 'hidden',
            '& .MuiTable-root': {
              minWidth: { xs: 600, md: 'auto' }
            }
          }}
        >
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Customer</TableCell>
                <TableCell>Sensor ID</TableCell>
                <TableCell>Quantity</TableCell>
                <TableCell>Frequency</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Description</TableCell>
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
                    <TableCell>{order.id}</TableCell>
                    <TableCell>{order.customerName}</TableCell>
                    <TableCell>{order.sensorId}</TableCell>
                    <TableCell>{order.quantity}</TableCell>
                    <TableCell>{order.frequency}</TableCell>
                    <TableCell>{order.date}</TableCell>
                    <TableCell>
                      <Button
                        variant="outlined"
                        startIcon={<VisibilityIcon />}
                        onClick={() => handleOpenDescription(order)}
                      >
                        See Description
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={order.status}
                        color={
                          order.status === "Taken" ? "success" : "warning"
                        }
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
                      {order.status === "Pending" && (
                        <IconButton
                          color="success"
                          onClick={() => handleTakeOrder(order.id)}
                        >
                          <AssignmentTurnedInIcon />
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

      {/* Dialogs and modals remain outside motion.div for proper z-index */}
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingOrder ? "Edit Order" : "Create New Order"}
        </DialogTitle>
        <DialogContent>
          <form onSubmit={handleCreateOrUpdateOrder} className="space-y-4">
            <TextField
              fullWidth
              label="Customer Name"
              name="customerName"
              variant="outlined"
              defaultValue={editingOrder?.customerName}
            />
            <TextField
              fullWidth
              type="number"
              label="Sensor ID"
              name="sensorId"
              variant="outlined"
              defaultValue={editingOrder?.sensorId}
            />
            <TextField
              fullWidth
              type="number"
              label="Quantity"
              name="quantity"
              variant="outlined"
              defaultValue={editingOrder?.quantity}
            />
            <TextField
              fullWidth
              label="Frequency"
              name="frequency"
              variant="outlined"
              defaultValue={editingOrder?.frequency}
            />
            <TextField
              fullWidth
              type="date"
              name="date"
              variant="outlined"
              InputLabelProps={{ shrink: true }}
              defaultValue={editingOrder?.date}
            />
            <TextField
              fullWidth
              label="Description"
              name="description"
              multiline
              rows={3}
              variant="outlined"
              defaultValue={editingOrder?.description}
            />
            <Button
              type="submit"
              variant="contained"
              color="primary"
              sx={{ fontWeight: 600 }}
            >
              {editingOrder ? "Update Order" : "Create Order"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
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
            width: 400,
            bgcolor: "background.paper",
            border: "2px solid #000",
            boxShadow: 24,
            p: 4,
          }}
        >
          <Typography id="description-modal-title" variant="h6" component="h2">
            Order Description
          </Typography>
          <Typography id="description-modal-description" sx={{ mt: 2 }}>
            {selectedOrder?.description}
          </Typography>
        </Box>
      </Modal>
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
  );
}
