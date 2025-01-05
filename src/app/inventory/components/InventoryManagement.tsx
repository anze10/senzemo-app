'use client'

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import {
    Table, TableBody, TableCell, TableHead, TableRow, TableContainer,
    Paper, Button, TextField, Dialog, DialogActions, DialogContent,
    DialogTitle, MenuItem, Select, FormControl, InputLabel, IconButton,
    Snackbar, Alert, Typography, Box, Chip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';

const theme = createTheme({
    palette: {
        primary: {
            main: '#15803d', // green-700
        },
        secondary: {
            main: '#0369a1', // sky-700
        },
    },
});

type InventoryItem = {
    id: number;
    name: string;
    quantity: number;
    type: string;
    lastUpdated: Date;
};

export function InventoryManagementPage() {
    const [inventory, setInventory] = useState<InventoryItem[]>([
        { id: 1, name: 'Part 1', quantity: 100, type: 'Component', lastUpdated: new Date() },
        { id: 2, name: 'Sensor A', quantity: 50, type: 'CompleteSensor', lastUpdated: new Date() },
    ]);
    const [open, setOpen] = useState(false);
    const [editItem, setEditItem] = useState<InventoryItem | null>(null);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

    const handleClickOpen = () => {
        setEditItem(null);
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
        setEditItem(null);
    };

    const handleAddOrUpdateItem = () => {
        if (editItem) {
            setInventory(inventory.map(item => item.id === editItem.id ? { ...editItem, lastUpdated: new Date() } : item));
            setSnackbar({ open: true, message: 'Item updated successfully!', severity: 'success' });
        } else {
            const newItem = {
                id: Math.max(...inventory.map(item => item.id)) + 1,
                name: 'New Item',
                quantity: 0,
                type: 'Component',
                lastUpdated: new Date()
            };
            setInventory([...inventory, newItem]);
            setSnackbar({ open: true, message: 'New item added successfully!', severity: 'success' });
        }
        handleClose();
    };

    const handleEditItem = (item: InventoryItem) => {
        setEditItem(item);
        setOpen(true);
    };

    const handleDeleteItem = (id: number) => {
        setInventory(inventory.filter(item => item.id !== id));
        setSnackbar({ open: true, message: 'Item deleted successfully!', severity: 'success' });
    };

    const handleQuantityChange = (id: number, change: number) => {
        setInventory(inventory.map(item =>
            item.id === id ? { ...item, quantity: Math.max(0, item.quantity + change), lastUpdated: new Date() } : item
        ));
    };

    useEffect(() => {
        const timer = setInterval(() => {
            setInventory(currentInventory =>
                currentInventory.map(item => ({ ...item, lastUpdated: new Date() }))
            );
        }, 60000); // Update every minute

        return () => clearInterval(timer);
    }, []);

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-8">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="max-w-7xl mx-auto"
                >
                    <Box className="flex justify-between items-center mb-8">
                        <Typography variant="h3" component="h1" className="text-green-700 font-bold">
                            Inventory Management
                        </Typography>
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={handleClickOpen}
                            startIcon={<AddIcon />}
                        >
                            Add Item
                        </Button>
                    </Box>
                    <Paper elevation={3} className="overflow-hidden mb-8">
                        <TableContainer>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>ID</TableCell>
                                        <TableCell>Name</TableCell>
                                        <TableCell>Quantity</TableCell>
                                        <TableCell>Type</TableCell>
                                        <TableCell>Last Updated</TableCell>
                                        <TableCell>Actions</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    <AnimatePresence>
                                        {inventory.map((item) => (
                                            <motion.tr
                                                key={item.id}
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                transition={{ duration: 0.3 }}
                                            >
                                                <TableCell>{item.id}</TableCell>
                                                <TableCell>{item.name}</TableCell>
                                                <TableCell>
                                                    <Box className="flex items-center">
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => handleQuantityChange(item.id, -1)}
                                                        >
                                                            <RemoveIcon />
                                                        </IconButton>
                                                        <Typography className="mx-2">{item.quantity}</Typography>
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => handleQuantityChange(item.id, 1)}
                                                        >
                                                            <AddIcon />
                                                        </IconButton>
                                                    </Box>
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={item.type}
                                                        color={item.type === 'Component' ? 'primary' : 'secondary'}
                                                    />
                                                </TableCell>
                                                <TableCell>{item.lastUpdated.toLocaleString()}</TableCell>
                                                <TableCell>
                                                    <IconButton color="primary" onClick={() => handleEditItem(item)}>
                                                        <EditIcon />
                                                    </IconButton>
                                                    <IconButton color="error" onClick={() => handleDeleteItem(item.id)}>
                                                        <DeleteIcon />
                                                    </IconButton>
                                                </TableCell>
                                            </motion.tr>
                                        ))}
                                    </AnimatePresence>
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                </motion.div>
            </div>
            <Dialog open={open} onClose={handleClose}>
                <DialogTitle>{editItem ? 'Edit Item' : 'Add Inventory Item'}</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        id="name"
                        label="Item Name"
                        type="text"
                        fullWidth
                        variant="standard"
                        value={editItem?.name || ''}
                        onChange={(e) => setEditItem(editItem ? { ...editItem, name: e.target.value } : null)}
                    />
                    <TextField
                        margin="dense"
                        id="quantity"
                        label="Quantity"
                        type="number"
                        fullWidth
                        variant="standard"
                        value={editItem?.quantity || ''}
                        onChange={(e) => setEditItem(editItem ? { ...editItem, quantity: parseInt(e.target.value) } : null)}
                    />
                    <FormControl fullWidth margin="dense">
                        <InputLabel id="type-label">Type</InputLabel>
                        <Select
                            labelId="type-label"
                            id="type"
                            label="Type"
                            value={editItem?.type || ''}
                            onChange={(e) => setEditItem(editItem ? { ...editItem, type: e.target.value } : null)}
                        >
                            <MenuItem value="Component">Component</MenuItem>
                            <MenuItem value="CompleteSensor">Complete Sensor</MenuItem>
                        </Select>
                    </FormControl>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose}>Cancel</Button>
                    <Button onClick={handleAddOrUpdateItem}>{editItem ? 'Update' : 'Add'} Item</Button>
                </DialogActions>
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

