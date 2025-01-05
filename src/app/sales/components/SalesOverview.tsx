'use client'

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import {
    Table, TableBody, TableCell, TableHead, TableRow, TableContainer, Paper,
    Button, TextField, Dialog, DialogContent, DialogTitle,
    IconButton, Chip, Snackbar, Alert, Typography, Box, Modal
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const theme = createTheme({
    palette: {
        primary: {
            main: '#ff9800',
        },
        secondary: {
            main: '#f44336',
        },
    },
});

type Sale = {
    id: number;
    sensorId: number;
    quantity: number;
    date: string;
    price: number;
    customerName: string;
};

export function SalesOverview() {
    const [sales, setSales] = useState<Sale[]>([
        { id: 1, sensorId: 1, quantity: 5, date: '2023-06-01', price: 100, customerName: 'Customer A' },
        { id: 2, sensorId: 2, quantity: 3, date: '2023-06-02', price: 150, customerName: 'Customer B' },
        { id: 3, sensorId: 1, quantity: 2, date: '2023-06-03', price: 120, customerName: 'Customer C' },
        { id: 4, sensorId: 3, quantity: 4, date: '2023-06-04', price: 130, customerName: 'Customer D' },
        { id: 5, sensorId: 2, quantity: 6, date: '2023-06-05', price: 140, customerName: 'Customer E' },
    ]);
    const [open, setOpen] = useState(false);
    const [editingSale, setEditingSale] = useState<Sale | null>(null);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
    const [totalRevenue, setTotalRevenue] = useState(0);
    const [trendModalOpen, setTrendModalOpen] = useState(false);
    const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

    const handleOpen = () => {
        setEditingSale(null);
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
        setEditingSale(null);
    };

    const handleRecordOrUpdateSale = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const newSale: Sale = {
            id: editingSale ? editingSale.id : Math.max(...sales.map(s => s.id)) + 1,
            sensorId: Number(formData.get('sensorId')),
            quantity: Number(formData.get('quantity')),
            date: formData.get('date') as string,
            price: Number(formData.get('price')),
            customerName: formData.get('customerName') as string,
        };

        if (editingSale) {
            setSales(sales.map(sale => sale.id === editingSale.id ? newSale : sale));
            setSnackbar({ open: true, message: 'Sale updated successfully!', severity: 'success' });
        } else {
            setSales([...sales, newSale]);
            setSnackbar({ open: true, message: 'New sale recorded successfully!', severity: 'success' });
        }
        handleClose();
    };

    const handleDeleteSale = (id: number) => {
        setSales(sales.filter(sale => sale.id !== id));
        setSnackbar({ open: true, message: 'Sale deleted successfully!', severity: 'success' });
    };

    const handleEditSale = (sale: Sale) => {
        setEditingSale(sale);
        setOpen(true);
    };

    const handleTrendClick = (sale: Sale) => {
        setSelectedSale(sale);
        setTrendModalOpen(true);
    };

    useEffect(() => {
        const newTotalRevenue = sales.reduce((total, sale) => total + sale.price * sale.quantity, 0);
        setTotalRevenue(newTotalRevenue);
    }, [sales]);

    const getTrendData = (sale: Sale) => {
        const saleIndex = sales.findIndex(s => s.id === sale.id);
        const previousSales = sales.slice(0, saleIndex + 1).reverse();
        return previousSales.map((s, index) => ({
            date: s.date,
            price: s.price,
            quantity: s.quantity,
            total: s.price * s.quantity,
        }));
    };

    return (
        <ThemeProvider theme={theme}>
            <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 p-8">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="max-w-7xl mx-auto"
                >
                    <Box className="flex justify-between items-center mb-8">
                        <Typography variant="h3" component="h1" className="text-orange-700 font-bold">
                            Sales Overview
                        </Typography>
                        <Button
                            variant="contained"
                            style={{ background: 'linear-gradient(90deg, #ff9800, #f44336)', color: 'white' }}
                            onClick={handleOpen}
                        >
                            Record New Sale
                        </Button>
                    </Box>
                    <Paper elevation={3} className="p-4 mb-8">
                        <Typography variant="h5" className="mb-2">Total Revenue</Typography>
                        <Typography variant="h4" className="font-bold">
                            ${totalRevenue.toFixed(2)}
                        </Typography>
                    </Paper>
                    <TableContainer component={Paper} elevation={3}>
                        <Table>
                            <TableHead>
                                <TableRow style={{ background: 'linear-gradient(90deg, #ff9800, #f44336)' }}>
                                    <TableCell style={{ color: 'white' }}>ID</TableCell>
                                    <TableCell style={{ color: 'white' }}>Sensor ID</TableCell>
                                    <TableCell style={{ color: 'white' }}>Quantity</TableCell>
                                    <TableCell style={{ color: 'white' }}>Date</TableCell>
                                    <TableCell style={{ color: 'white' }}>Price</TableCell>
                                    <TableCell style={{ color: 'white' }}>Customer</TableCell>
                                    <TableCell style={{ color: 'white' }}>Total</TableCell>
                                    <TableCell style={{ color: 'white' }}>Trend</TableCell>
                                    <TableCell style={{ color: 'white' }}>Actions</TableCell>
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
                                            <TableCell>{sale.sensorId}</TableCell>
                                            <TableCell>{sale.quantity}</TableCell>
                                            <TableCell>{sale.date}</TableCell>
                                            <TableCell>${sale.price.toFixed(2)}</TableCell>
                                            <TableCell>{sale.customerName}</TableCell>
                                            <TableCell>${(sale.price * sale.quantity).toFixed(2)}</TableCell>
                                            <TableCell>
                                                <Button
                                                    variant="outlined"
                                                    startIcon={index > 0 && sales[index].price > sales[index - 1].price ? <TrendingUpIcon /> : <TrendingDownIcon />}
                                                    color={index > 0 && sales[index].price > sales[index - 1].price ? 'success' : 'error'}
                                                    onClick={() => handleTrendClick(sale)}
                                                >
                                                    {index > 0 && sales[index].price > sales[index - 1].price ? 'Up' : 'Down'}
                                                </Button>
                                            </TableCell>
                                            <TableCell>
                                                <IconButton color="primary" onClick={() => handleEditSale(sale)}>
                                                    <EditIcon />
                                                </IconButton>
                                                <IconButton color="error" onClick={() => handleDeleteSale(sale.id)}>
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
            </div>
            <Dialog open={open} onClose={handleClose}>
                <DialogTitle>{editingSale ? 'Edit Sale' : 'Record New Sale'}</DialogTitle>
                <DialogContent>
                    <form onSubmit={handleRecordOrUpdateSale} className="space-y-4">
                        <TextField fullWidth type="number" name="sensorId" label="Sensor ID" variant="outlined" defaultValue={editingSale?.sensorId} />
                        <TextField fullWidth type="number" name="quantity" label="Quantity" variant="outlined" defaultValue={editingSale?.quantity} />
                        <TextField fullWidth type="date" name="date" label="Date" InputLabelProps={{ shrink: true }} variant="outlined" defaultValue={editingSale?.date} />
                        <TextField fullWidth type="number" name="price" label="Price" variant="outlined" inputProps={{ step: '0.01' }} defaultValue={editingSale?.price} />
                        <TextField fullWidth name="customerName" label="Customer Name" variant="outlined" defaultValue={editingSale?.customerName} />
                        <Button type="submit" variant="contained" style={{ background: 'linear-gradient(90deg, #ff9800, #f44336)', color: 'white' }}>
                            {editingSale ? 'Update Sale' : 'Record Sale'}
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>
            <Modal
                open={trendModalOpen}
                onClose={() => setTrendModalOpen(false)}
                aria-labelledby="trend-modal-title"
                aria-describedby="trend-modal-description"
            >
                <Box sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: 600,
                    bgcolor: 'background.paper',
                    border: '2px solid #000',
                    boxShadow: 24,
                    p: 4,
                }}>
                    <Typography id="trend-modal-title" variant="h6" component="h2">
                        Trend Data for Sale #{selectedSale?.id}
                    </Typography>
                    <Typography id="trend-modal-description" sx={{ mt: 2 }}>
                        Customer: {selectedSale?.customerName}
                    </Typography>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart
                            data={selectedSale ? getTrendData(selectedSale) : []}
                            margin={{
                                top: 5,
                                right: 30,
                                left: 20,
                                bottom: 5,
                            }}
                        >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis yAxisId="left" />
                            <YAxis yAxisId="right" orientation="right" />
                            <Tooltip />
                            <Legend />
                            <Line yAxisId="left" type="monotone" dataKey="price" stroke="#8884d8" activeDot={{ r: 8 }} />
                            <Line yAxisId="left" type="monotone" dataKey="quantity" stroke="#82ca9d" />
                            <Line yAxisId="right" type="monotone" dataKey="total" stroke="#ffc658" />
                        </LineChart>
                    </ResponsiveContainer>
                </Box>
            </Modal>
            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
            >
                <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </ThemeProvider>
    );
}

