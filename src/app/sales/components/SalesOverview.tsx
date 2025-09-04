"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
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
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import BarChartIcon from "@mui/icons-material/BarChart";

type Sale = {
  id: number;
  sensorId: number;
  quantity: number;
  date: string;
  price: number;
  customerName: string;
  status: "Completed" | "Pending" | "Cancelled";
};

export default function SalesOverview() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [sales, setSales] = useState<Sale[]>([
    {
      id: 1,
      sensorId: 1,
      quantity: 5,
      date: "2023-06-01",
      price: 100,
      customerName: "Customer A",
      status: "Completed",
    },
    {
      id: 2,
      sensorId: 2,
      quantity: 3,
      date: "2023-06-02",
      price: 150,
      customerName: "Customer B",
      status: "Pending",
    },
    {
      id: 3,
      sensorId: 1,
      quantity: 2,
      date: "2023-06-03",
      price: 120,
      customerName: "Customer C",
      status: "Completed",
    },
  ]);

  const [open, setOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error",
  });

  const totalRevenue = sales
    .filter((sale) => sale.status === "Completed")
    .reduce((sum, sale) => sum + sale.price * sale.quantity, 0);

  const totalSales = sales.filter((sale) => sale.status === "Completed").length;

  const handleClickOpen = () => {
    setEditingSale(null);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingSale(null);
  };

  const handleCreateOrUpdateSale = (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    const newSale: Sale = {
      id: editingSale ? editingSale.id : Date.now(),
      sensorId: Number(formData.get("sensorId")),
      quantity: Number(formData.get("quantity")),
      date: formData.get("date") as string,
      price: Number(formData.get("price")),
      customerName: formData.get("customerName") as string,
      status: editingSale ? editingSale.status : "Pending",
    };

    if (editingSale) {
      setSales(
        sales.map((sale) => (sale.id === editingSale.id ? newSale : sale)),
      );
      setSnackbar({
        open: true,
        message: "Sale updated successfully!",
        severity: "success",
      });
    } else {
      setSales([...sales, newSale]);
      setSnackbar({
        open: true,
        message: "New sale created successfully!",
        severity: "success",
      });
    }
    handleClose();
  };

  const handleDeleteSale = (id: number) => {
    setSales(sales.filter((sale) => sale.id !== id));
    setSnackbar({
      open: true,
      message: "Prodaja uspešno izbrisana!",
      severity: "success",
    });
  };

  const handleEditSale = (sale: Sale) => {
    setEditingSale(sale);
    setOpen(true);
  };

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
              Sales Overview
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
              Record New Sale
            </Button>
          </Box>
        </Box>

        {/* Statistics Cards */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
            gap: 2,
            mb: 4,
          }}
        >
          <Card>
            <CardContent>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Box>
                  <Typography color="text.secondary" variant="body2">
                    Total Revenue
                  </Typography>
                  <Typography variant="h4" component="div" color="success.main">
                    €{totalRevenue.toFixed(2)}
                  </Typography>
                </Box>
                <TrendingUpIcon color="success" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Box>
                  <Typography color="text.secondary" variant="body2">
                    Completed Sales
                  </Typography>
                  <Typography variant="h4" component="div" color="primary.main">
                    {totalSales}
                  </Typography>
                </Box>
                <BarChartIcon color="primary" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Box>
                  <Typography color="text.secondary" variant="body2">
                    Average Sale Value
                  </Typography>
                  <Typography variant="h4" component="div" color="info.main">
                    €
                    {totalSales > 0
                      ? (totalRevenue / totalSales).toFixed(2)
                      : "0.00"}
                  </Typography>
                </Box>
                <TrendingUpIcon color="info" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* Sales Table */}
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
                <TableCell>ID</TableCell>
                <TableCell>Kupec</TableCell>
                <TableCell>ID senzorja</TableCell>
                <TableCell>Količina</TableCell>
                <TableCell>Cena na enoto</TableCell>
                <TableCell>Skupaj</TableCell>
                <TableCell>Datum</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Dejanja</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <AnimatePresence>
                {sales.map((sale, index) => (
                  <motion.tr
                    key={sale.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                  >
                    <TableCell>{sale.id}</TableCell>
                    <TableCell>{sale.customerName}</TableCell>
                    <TableCell>{sale.sensorId}</TableCell>
                    <TableCell>{sale.quantity}</TableCell>
                    <TableCell>€{sale.price.toFixed(2)}</TableCell>
                    <TableCell>
                      €{(sale.price * sale.quantity).toFixed(2)}
                    </TableCell>
                    <TableCell>{sale.date}</TableCell>
                    <TableCell>
                      <Chip
                        label={sale.status}
                        color={
                          sale.status === "Completed"
                            ? "success"
                            : sale.status === "Pending"
                              ? "warning"
                              : "error"
                        }
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <IconButton
                        color="primary"
                        onClick={() => handleEditSale(sale)}
                        size="small"
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        color="error"
                        onClick={() => handleDeleteSale(sale.id)}
                        size="small"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </TableBody>
          </Table>
        </TableContainer>
      </motion.div>

      {/* Create/Edit Dialog */}
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingSale ? "Edit Sale" : "Record New Sale"}
        </DialogTitle>
        <DialogContent>
          <Box
            component="form"
            onSubmit={handleCreateOrUpdateSale}
            sx={{ pt: 2 }}
          >
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" },
                gap: 2,
              }}
            >
              <TextField
                fullWidth
                label="Customer Name"
                name="customerName"
                variant="outlined"
                defaultValue={editingSale?.customerName}
                required
              />
              <TextField
                fullWidth
                type="number"
                label="Sensor ID"
                name="sensorId"
                variant="outlined"
                defaultValue={editingSale?.sensorId}
                required
              />
              <TextField
                fullWidth
                type="number"
                label="Quantity"
                name="quantity"
                variant="outlined"
                defaultValue={editingSale?.quantity}
                inputProps={{ min: 1 }}
                required
              />
              <TextField
                fullWidth
                type="number"
                label="Price per Unit (€)"
                name="price"
                variant="outlined"
                defaultValue={editingSale?.price}
                inputProps={{ min: 0, step: 0.01 }}
                required
              />
              <TextField
                fullWidth
                type="date"
                label="Sale Date"
                name="date"
                variant="outlined"
                InputLabelProps={{ shrink: true }}
                defaultValue={editingSale?.date}
                required
              />
            </Box>

            <Box
              sx={{
                mt: 3,
                display: "flex",
                justifyContent: "flex-end",
                gap: 1,
              }}
            >
              <Button onClick={handleClose}>Prekliči</Button>
              <Button
                type="submit"
                variant="contained"
                sx={{ fontWeight: 600 }}
              >
                {editingSale ? "Update Sale" : "Record Sale"}
              </Button>
            </Box>
          </Box>
        </DialogContent>
      </Dialog>

      {/* Snackbar for notifications */}
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
