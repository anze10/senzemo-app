'use client'

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import {
    Table, TableBody, TableCell, TableHead, TableRow, TableContainer, Paper,
    Button, TextField, Dialog, DialogContent, DialogTitle,
    IconButton, Snackbar, Alert, Typography, Box, MenuItem
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';

const theme = createTheme({
    palette: {
        primary: {
            main: '#3f51b5',
        },
        secondary: {
            main: '#9c27b0',
        },
    },
});

type Product = {
    id: number;
    name: string;
    frequency: string;
    type: 'Sensor' | 'Transmitter' | 'Receiver';
    price: number;
};

export function ProductList() {
    const [products, setProducts] = useState<Product[]>([
        { id: 1, name: 'Basic Sensor', frequency: '433 MHz', type: 'Sensor', price: 29.99 },
        { id: 2, name: 'Advanced Transmitter', frequency: '868 MHz', type: 'Transmitter', price: 49.99 },
        { id: 3, name: 'High-Gain Receiver', frequency: '915 MHz', type: 'Receiver', price: 39.99 },
    ]);
    const [open, setOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

    const handleOpen = () => {
        setEditingProduct(null);
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
        setEditingProduct(null);
    };

    const handleAddOrUpdateProduct = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const newProduct: Product = {
            id: editingProduct ? editingProduct.id : Math.max(...products.map(p => p.id)) + 1,
            name: formData.get('name') as string,
            frequency: formData.get('frequency') as string,
            type: formData.get('type') as 'Sensor' | 'Transmitter' | 'Receiver',
            price: Number(formData.get('price')),
        };

        if (editingProduct) {
            setProducts(products.map(product => product.id === editingProduct.id ? newProduct : product));
            setSnackbar({ open: true, message: 'Product updated successfully!', severity: 'success' });
        } else {
            setProducts([...products, newProduct]);
            setSnackbar({ open: true, message: 'New product added successfully!', severity: 'success' });
        }
        handleClose();
    };

    const handleDeleteProduct = (id: number) => {
        setProducts(products.filter(product => product.id !== id));
        setSnackbar({ open: true, message: 'Product deleted successfully!', severity: 'success' });
    };

    const handleEditProduct = (product: Product) => {
        setEditingProduct(product);
        setOpen(true);
    };

    return (
        <ThemeProvider theme={theme}>
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-8">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="max-w-7xl mx-auto"
                >
                    <Box className="flex justify-between items-center mb-8">
                        <Typography variant="h3" component="h1" className="text-purple-700 font-bold">
                            Product List
                        </Typography>
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            style={{ background: 'linear-gradient(to right, #3f51b5, #9c27b0)', color: 'white' }}
                            onClick={handleOpen}
                        >
                            Add New Product
                        </Button>
                    </Box>
                    <TableContainer component={Paper} elevation={3}>
                        <Table>
                            <TableHead>
                                <TableRow style={{ background: 'linear-gradient(to right, #3f51b5, #9c27b0)' }}>
                                    <TableCell style={{ color: 'white' }}>ID</TableCell>
                                    <TableCell style={{ color: 'white' }}>Name</TableCell>
                                    <TableCell style={{ color: 'white' }}>Frequency</TableCell>
                                    <TableCell style={{ color: 'white' }}>Type</TableCell>
                                    <TableCell style={{ color: 'white' }}>Price</TableCell>
                                    <TableCell style={{ color: 'white' }}>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                <AnimatePresence>
                                    {products.map((product, index) => (
                                        <motion.tr
                                            key={product.id}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -20 }}
                                            transition={{ duration: 0.3, delay: index * 0.1 }}
                                        >
                                            <TableCell>{product.id}</TableCell>
                                            <TableCell>{product.name}</TableCell>
                                            <TableCell>{product.frequency}</TableCell>
                                            <TableCell>{product.type}</TableCell>
                                            <TableCell>${product.price.toFixed(2)}</TableCell>
                                            <TableCell>
                                                <IconButton color="secondary" onClick={() => handleEditProduct(product)}>
                                                    <EditIcon />
                                                </IconButton>
                                                <IconButton color="error" onClick={() => handleDeleteProduct(product.id)}>
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
                <DialogTitle>{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
                <DialogContent>
                    <form onSubmit={handleAddOrUpdateProduct} className="space-y-4">
                        <TextField
                            fullWidth
                            name="name"
                            label="Product Name"
                            variant="outlined"
                            defaultValue={editingProduct?.name}
                            required
                        />
                        <TextField
                            fullWidth
                            name="frequency"
                            label="Frequency"
                            variant="outlined"
                            defaultValue={editingProduct?.frequency}
                            required
                        />
                        <TextField
                            fullWidth
                            name="type"
                            label="Type"
                            variant="outlined"
                            select
                            defaultValue={editingProduct?.type || 'Sensor'}
                            required
                        >
                            <MenuItem value="Sensor">Sensor</MenuItem>
                            <MenuItem value="Transmitter">Transmitter</MenuItem>
                            <MenuItem value="Receiver">Receiver</MenuItem>
                        </TextField>
                        <TextField
                            fullWidth
                            name="price"
                            label="Price"
                            variant="outlined"
                            type="number"
                            inputProps={{ step: "0.01" }}
                            defaultValue={editingProduct?.price}
                            required
                        />
                        <Button
                            type="submit"
                            variant="contained"
                            fullWidth
                            style={{ background: 'linear-gradient(to right, #3f51b5, #9c27b0)', color: 'white' }}
                        >
                            {editingProduct ? 'Update Product' : 'Add Product'}
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>
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

