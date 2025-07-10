'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import {
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Paper, Button, TextField, Dialog, DialogActions, DialogContent,
    DialogTitle, IconButton, Snackbar, Alert, Typography, Box, Chip,
    Tabs, Tab, MenuItem, Select
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import EditIcon from '@mui/icons-material/Edit';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import HistoryIcon from '@mui/icons-material/History';
import { addSensorToInventory, adjustComponentStock, getSensors, showAllComponents, showSensorInInventory } from 'src/app/inventory/components/backent';
import { useQuery } from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adjustSensorStock } from 'src/app/inventory/components/backent';

const theme = createTheme({
    palette: {
        primary: {
            main: '#15803d',
        },
        secondary: {
            main: '#0369a1',
        },
    },
});

type Frequency = '868 MHz' | '915 MHz' | '433 MHz' | '2.4 GHz' | 'Custom';

type LogEntry = {
    id: number;
    timestamp: Date;
    itemType: 'sensor' | 'component';
    // itemId: number;
    itemName: string;
    change: number;
    reason: string;
    user?: string; // Optional user field for future use
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
};

type InventoryItem = SenzorStockItem | ComponentStockItem;

type SensorOption = {
    id: number;
    name: string;
    selected: boolean;
    requiredQuantity: number;
};

export default function InventoryManagementPage() {
    const [activeTab, setActiveTab] = useState(0);
    const [sensorInventory, setSensorInventory] = useState<SenzorStockItem[]>([]);
    const [componentInventory, setComponentInventory] = useState<ComponentStockItem[]>([]);
    const [logs, setLogs] = useState<LogEntry[]>([]);

    const [open, setOpen] = useState(false);
    const [editItem, setEditItem] = useState<InventoryItem | null>(null);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
    const [sensorOptions, setSensorOptions] = useState<SensorOption[]>([]);
    const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [adjustmentReason, setAdjustmentReason] = useState('');
    const [adjustmentDialogOpen, setAdjustmentDialogOpen] = useState(false);
    const [currentAdjustItem, setCurrentAdjustItem] = useState<InventoryItem | null>(null);
    const [adjustmentType, setAdjustmentType] = useState<'increase' | 'decrease'>('increase');
    const [adjustmentQuantity, setAdjustmentQuantity] = useState(1);
    const queryClient = useQueryClient();
    // Frequency options for sensors
    const frequencyOptions: Frequency[] = ['868 MHz', '915 MHz', '433 MHz', '2.4 GHz', 'Custom'];

    // Initialize new item form based on tab
    const initializeNewItem = useCallback(() => {
        if (activeTab === 0) {
            return {
                id: 0,
                senzorId: 0,
                sensorName: '',
                quantity: 0,
                location: 'Main Warehouse',
                lastUpdated: new Date(),
                frequency: '868 MHz' as Frequency,
            } as SenzorStockItem;
        } else {
            return {
                id: 0,
                componentId: 0,
                name: '',
                quantity: 0,
                location: 'Main Warehouse',
                lastUpdated: new Date(),
                sensorAssignments: [],
                invoiceNumber: '',
                contactDetails: {
                    supplier: '',
                    email: '',
                    phone: ''
                }
            } as ComponentStockItem;
        }
    }, [activeTab]);

    const { data: allSensors = [] } = useQuery({
        queryKey: ['sensors'],
        queryFn: getSensors,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });


    const { data: allComponents = [] } = useQuery({
        queryKey: ['components-inventory'],
        queryFn: showAllComponents,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });

    const { data: rawInventory = [] } = useQuery({
        queryKey: ['sensors-inventory'],
        queryFn: showSensorInInventory,
        staleTime: 5 * 60 * 1000
    });

    useEffect(() => {
        if (rawInventory) {
            console.log("Raw Inventory Data:", rawInventory);
        }
    }, [rawInventory]);


    const currentInventory: SenzorStockItem[] = rawInventory.map(item => ({
        id: item.id,
        senzorId: item.sensorId,
        sensorName: item.sensorName,
        quantity: item.quantity,
        location: item.location,
        lastUpdated: new Date(item.lastUpdated),
        frequency: (item.frequency as Frequency) || undefined,
    }));

    console.log('Current Inventory:', currentInventory);

    // Initialize sensor options when editing a component
    useEffect(() => {
        if (open && activeTab === 1) {
            const componentItem = editItem as ComponentStockItem;
            const options = allSensors
                .filter(sensor => typeof sensor.id === 'number')
                .map(sensor => {
                    const existingAssignment = componentItem?.sensorAssignments?.find(
                        a => a.sensorId === sensor.id
                    );

                    return {
                        id: sensor.id as number,
                        name: sensor.sensorName,
                        selected: !!existingAssignment,
                        requiredQuantity: existingAssignment?.requiredQuantity || 1
                    };
                });

            setSensorOptions(options);
            setInvoiceNumber(componentItem.invoiceNumber || '');
        }
    }, [open, editItem, activeTab, allSensors]);

    // Reset form when tab changes
    useEffect(() => {
        if (!open) {
            setEditItem(initializeNewItem());
            setInvoiceNumber('');
        }
    }, [activeTab, open, initializeNewItem]);

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
        setInvoiceNumber('');
    };

    const handleRequiredQuantityChange = (sensorId: number, value: number) => {
        setSensorOptions(prev => prev.map(option =>
            option.id === sensorId
                ? { ...option, requiredQuantity: Math.max(1, value) }
                : option
        ));
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
            setInvoiceFile(e.dataTransfer.files[0]);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setInvoiceFile(e.target.files[0]);
        }
    };

    // const logChange = (item: InventoryItem, change: number, reason: string) => {

    //     const newLog: LogEntry = {
    //         id: Date.now(),
    //         timestamp: new Date(),
    //         itemType: 'componentId' in item ? 'component' : 'sensor',
    //         //itemId: item.id,
    //         itemName: 'sensorName' in item ? item.sensorName : item.name,
    //         change,
    //         reason,
    //     };

    //     if ('componentId' in item && change > 0) {
    //         newLog.invoiceNumber = item.invoiceNumber;
    //     }

    //     setLogs(prev => [newLog, ...prev]);
    // };

    // Define addNewSensor mutation at the top level of the component
    // const queryClient = useQueryClient(); // Removed duplicate declaration

    const handleAddOrUpdateSensor = async () => {
        if (!editItem) return;

        try {
            if ('senzorId' in editItem) {
                // Validate required fields for sensors
                if (!editItem.senzorId || !editItem.location || !editItem.frequency) {
                    const missingFields = [];
                    if (!editItem.senzorId) missingFields.push('sensor');
                    if (!editItem.location) missingFields.push('location');
                    if (!editItem.frequency) missingFields.push('frequency');

                    setSnackbar({
                        open: true,
                        message: `Please fill in required fields: ${missingFields.join(', ')}`,
                        severity: 'error'
                    });
                    return;
                }

                // Update existing sensor
                if (editItem.id) {
                    setSensorInventory(
                        sensorInventory.map((item) =>
                            item.id === editItem.id
                                ? { ...(editItem as SenzorStockItem), lastUpdated: new Date() }
                                : item
                        )
                    );
                }
                // Add new sensor with backend integration
                else {
                    const { senzorId, quantity, location, frequency, dev_eui } = editItem as SenzorStockItem;

                    // Call mutation to add sensor to backend
                    const newSensor = await addNewSensor.mutateAsync({
                        sensorId: senzorId,
                        quantity: quantity || 1, // Default to 1 if not provided
                        location,
                        frequency: frequency as Frequency,
                        dev_eui
                    });

                    // Update frontend state with response from backend
                    setSensorInventory((prev) => [
                        ...prev,
                        {
                            id: newSensor.id,
                            senzorId: (newSensor.senzorId ?? newSensor.sensorId) as number,
                            sensorName:
                                (newSensor as { sensorName?: string }).sensorName ??
                                allSensors.find((s) => s.id === (newSensor.senzorId ?? newSensor.sensorId))?.sensorName ??
                                '',
                            quantity: newSensor.quantity,
                            location: newSensor.location,
                            lastUpdated: newSensor.lastUpdated ? new Date(newSensor.lastUpdated) : new Date(),
                            frequency: (newSensor.frequency as Frequency) ?? undefined,
                            dev_eui: (newSensor as { dev_eui?: string; productionListDevEUI?: string }).dev_eui ??
                                (newSensor as { dev_eui?: string; productionListDevEUI?: string }).productionListDevEUI ??
                                undefined,
                        } as SenzorStockItem,
                    ]);
                }
            } else {
                // Existing component handling code
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
                                : item
                        )
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
                    console.log('Uploading invoice:', invoiceFile.name);
                    // Actual file upload would go here
                }
            }

            setSnackbar({
                open: true,
                message: `Item ${editItem.id ? 'updated' : 'added'} successfully!`,
                severity: 'success',
            });
            handleClose();
        } catch (error) {
            console.error('Error saving item:', error);
            setSnackbar({
                open: true,
                message: 'Failed to save item: ' + (error as Error).message,
                severity: 'error',
            });
        }
    };

    // Mutation for adjusting component stock
    const adjustComponentStockMutation = useMutation({
        mutationFn: async (params: {
            stockId: number;
            quantity: number;
            reason: string;
            invoiceNumber?: string
        }) => {
            return adjustComponentStock(
                params.stockId,
                params.quantity,
                params.reason,
                params.invoiceNumber || null
            );
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['components-inventory'] });
        },
        onError: (error: unknown) => {
            setSnackbar({
                open: true,
                message: (error as Error)?.message || 'Failed to adjust component stock',
                severity: 'error',
            });
        }
    });

    // Updated handleAddOrUpdateComponent with mutation
    const handleAddOrUpdateComponent = async () => {
        if (!editItem) return;

        // Validate required fields for components
        const missingFields = [];
        if ('name' in editItem && !editItem.name) missingFields.push('Component Name');
        if (!invoiceNumber) missingFields.push('Invoice Number');

        if (missingFields.length > 0) {
            setSnackbar({
                open: true,
                message: `Please fill in required fields: ${missingFields.join(', ')}`,
                severity: 'error'
            });
            return;
        }

        // Prepare updated component item
        const updatedItem: ComponentStockItem = {
            id: editItem.id ?? Date.now(),
            componentId: (editItem as ComponentStockItem).componentId ?? 0,
            name: (editItem as ComponentStockItem).name ?? '',
            quantity: editItem.quantity ?? 0,
            location: editItem.location ?? '',
            lastUpdated: new Date(),
            sensorAssignments: sensorOptions
                .filter(option => option.selected)
                .map(option => ({
                    sensorId: option.id,
                    sensorName: option.name,
                    requiredQuantity: option.requiredQuantity
                })),
            invoiceNumber: invoiceNumber,
            contactDetails: (editItem as ComponentStockItem).contactDetails ?? {
                supplier: '',
                email: '',
                phone: ''
            }
        };

        // If updating existing component, use mutation
        if (editItem.id) {
            try {
                await adjustComponentStockMutation.mutateAsync({
                    stockId: editItem.id,
                    quantity: updatedItem.quantity,
                    reason: 'Manual update',
                    invoiceNumber: invoiceNumber
                });
                setSnackbar({
                    open: true,
                    message: 'Component updated successfully!',
                    severity: 'success'
                });
            } catch {
                // Snackbar handled in mutation onError
                return;
            }
        } else {
            // Add new component locally (replace with backend integration as needed)
            setComponentInventory(prev => [
                ...prev,
                {
                    ...updatedItem,
                    id: Date.now()  // Temporary ID until backend integration
                }
            ]);
            setSnackbar({
                open: true,
                message: 'Component added successfully!',
                severity: 'success'
            });
        }

        // Handle invoice file upload
        if (invoiceFile) {
            console.log('Uploading invoice:', invoiceFile.name);
            // Actual upload logic would go here
            // uploadInvoice(invoiceFile, invoiceNumber);
        }

        // Close dialog and reset state
        handleClose();
    }

    // Updated mutation without success/error handlers
    const addNewSensor = useMutation({
        mutationFn: async ({
            sensorId,
            quantity,
            location,
            frequency,
            dev_eui,
            BN
        }: {
            sensorId: number;
            quantity: number;
            location: string;
            frequency: Frequency;
            dev_eui?: string;
            BN?: number;
        }) => {
            const result = await addSensorToInventory(sensorId, quantity, location, frequency, BN ?? 0, dev_eui ?? '');
            // If result is an array, take the first item; otherwise, use result directly
            const sensor =
                Array.isArray(result) && result.length > 0
                    ? result[0]
                    : result;

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
            // Automatically add the new sensor to the inventory
            const senzorId = newSensor.senzorId ?? newSensor.sensorId ?? 0;
            const sensorName =
                newSensor.sensorName ??
                allSensors.find((s) => s.id === senzorId)?.sensorName ??
                '';
            setSensorInventory((prev) => [
                ...prev,
                {
                    id: newSensor.id,
                    senzorId,
                    sensorName,
                    quantity: newSensor.quantity,
                    location: newSensor.location,
                    lastUpdated: newSensor.lastUpdated ? new Date(newSensor.lastUpdated) : new Date(),
                    frequency: newSensor.frequency ?? undefined,
                    dev_eui: newSensor.dev_eui ?? newSensor.productionListDevEUI ?? undefined,
                } as SenzorStockItem,
            ]);
            queryClient.invalidateQueries({ queryKey: ['sensors-inventory'] });
        },
        onError: (error: unknown) => {
            setSnackbar({
                open: true,
                message: (error as Error)?.message || 'Failed to add sensor',
                severity: 'error',
            });
        },
    });

    // Updated sensor form structure

    const handleEditItem = (item: InventoryItem) => {
        setEditItem(item);
        if ('invoiceNumber' in item) {
            setInvoiceNumber(item.invoiceNumber || '');
        }
        setOpen(true);
    };




    //const queryClient = useQueryClient();

    const adjustSensorStockMutation = useMutation({
        mutationFn: async ({
            stockId,
            quantity,
            reason,
            dev_eui

        }: {
            stockId: number;
            quantity: number;
            reason: string;
            dev_eui: string;

        }) => {
            return adjustSensorStock(stockId, quantity, reason, dev_eui);
        },
        onSuccess: () => {

            queryClient.invalidateQueries({ queryKey: ['sensors-inventory'] });
        },
        onError: (error: unknown) => {
            setSnackbar({
                open: true,
                message: (error as Error)?.message || 'Failed to adjust sensor stock',
                severity: 'error',
            });
        },
    });

    const openAdjustmentDialog = (item: InventoryItem, type: 'increase' | 'decrease') => {
        setCurrentAdjustItem(item);
        setAdjustmentType(type);
        setAdjustmentReason('');
        setAdjustmentQuantity(1);
        setAdjustmentDialogOpen(true);
    };

    // Updated confirmAdjustment for sensors
    const confirmAdjustment = async () => {
        if (!currentAdjustItem || !adjustmentReason) return;

        const change = adjustmentType === 'increase' ? adjustmentQuantity : -adjustmentQuantity;

        try {
            if ('senzorId' in currentAdjustItem) {
                // Handle sensor adjustment
                await adjustSensorStockMutation.mutateAsync({
                    stockId: currentAdjustItem.id!,
                    quantity: change,
                    reason: adjustmentReason,
                    dev_eui: currentAdjustItem.dev_eui ?? ''
                });
            } else {
                // Handle component adjustment
                await adjustComponentStockMutation.mutateAsync({
                    stockId: currentAdjustItem.id!,
                    quantity: change,
                    reason: adjustmentReason,
                    invoiceNumber: (currentAdjustItem as ComponentStockItem).invoiceNumber
                });
            }

            setAdjustmentDialogOpen(false);
        } catch (error) {
            console.error('Adjustment failed:', error);
        }
    };





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
                    </Box>

                    <Tabs value={activeTab} onChange={handleTabChange} className="mb-6">
                        <Tab label="Sensors" />
                        <Tab label="Components" />
                        <Tab label="Logs" icon={<HistoryIcon />} />
                    </Tabs>

                    {activeTab === 2 ? (
                        // Logs tab
                        <Paper elevation={3} className="overflow-hidden mb-8">
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
                                        {logs.map(log => (
                                            <TableRow key={log.id}>
                                                <TableCell>{log.timestamp.toLocaleString()}</TableCell>
                                                <TableCell>{log.itemName}</TableCell>
                                                <TableCell>{log.itemType}</TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={log.change > 0 ? `+${log.change}` : log.change}
                                                        color={log.change > 0 ? 'success' : 'error'}
                                                        variant="outlined"
                                                    />
                                                </TableCell>
                                                <TableCell>{log.reason}</TableCell>
                                                <TableCell>{log.user}</TableCell>
                                                <TableCell>{log.invoiceNumber || '-'}</TableCell>
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
                    ) : (
                        // Inventory tabs
                        <>
                            <Paper elevation={3} className="overflow-hidden mb-8">
                                <TableContainer>
                                    <Table>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Name</TableCell>
                                                {activeTab === 0 && <TableCell>Frequency</TableCell>}
                                                <TableCell>Quantity</TableCell>
                                                <TableCell>Location</TableCell>
                                                {activeTab === 1 && <TableCell>Supplier Contact</TableCell>}
                                                {activeTab === 1 && <TableCell>Sensor Requirements</TableCell>}
                                                <TableCell>Last Updated</TableCell>
                                                <TableCell>Actions</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            <AnimatePresence>
                                                {activeTab === 0 && currentInventory.length > 0 &&
                                                    currentInventory.map((item) => (
                                                        <motion.tr
                                                            key={item.id}
                                                            initial={{ opacity: 0, height: 0 }}
                                                            animate={{ opacity: 1, height: 'auto' }}
                                                            exit={{ opacity: 0, height: 0 }}
                                                            transition={{ duration: 0.3 }}
                                                        >
                                                            <TableCell className="font-bold">
                                                                {'sensorName' in item ? item.sensorName : (item as ComponentStockItem).name}
                                                            </TableCell>
                                                            {activeTab === 0 && (
                                                                <TableCell>
                                                                    {('frequency' in item) && item.frequency}
                                                                </TableCell>
                                                            )}
                                                            <TableCell>
                                                                <Box className="flex items-center">
                                                                    <IconButton
                                                                        size="small"
                                                                        onClick={() => openAdjustmentDialog(item, 'decrease')}
                                                                    >
                                                                        <RemoveIcon />
                                                                    </IconButton>
                                                                    <Typography className="mx-2">{item.quantity}</Typography>
                                                                    <IconButton
                                                                        size="small"
                                                                        onClick={() => openAdjustmentDialog(item, 'increase')}
                                                                    >
                                                                        <AddIcon />
                                                                    </IconButton>
                                                                </Box>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Chip
                                                                    label={item.location}
                                                                    color="default"
                                                                    variant="outlined"
                                                                />
                                                            </TableCell>
                                                            <TableCell>
                                                                {item.lastUpdated ? item.lastUpdated.toLocaleString() : '-'}
                                                            </TableCell>
                                                            <TableCell>
                                                                <IconButton color="primary" onClick={() => handleEditItem(item)}>
                                                                    <EditIcon />
                                                                </IconButton>
                                                            </TableCell>
                                                        </motion.tr>
                                                    ))}
                                                {activeTab === 1 && allComponents.length > 0 &&
                                                    allComponents.map((item1) => (
                                                        <motion.tr
                                                            key={item1.id}
                                                            initial={{ opacity: 0, height: 0 }}
                                                            animate={{ opacity: 1, height: 'auto' }}
                                                            exit={{ opacity: 0, height: 0 }}
                                                            transition={{ duration: 0.3 }}
                                                        >
                                                            <TableCell className="font-bold">{item1.name || '-'}</TableCell>
                                                            <TableCell>
                                                                <Box className="flex items-center">
                                                                    <IconButton size="small" onClick={() => openAdjustmentDialog(item1, 'decrease')}>
                                                                        <RemoveIcon />
                                                                    </IconButton>
                                                                    <Typography className="mx-2">{item1.quantity ?? '-'}</Typography>
                                                                    <IconButton size="small" onClick={() => openAdjustmentDialog(item1, 'increase')}>
                                                                        <AddIcon />
                                                                    </IconButton>
                                                                </Box>
                                                            </TableCell>
                                                            <TableCell>{item1.location || '-'}</TableCell>
                                                            <TableCell>{item1.contactDetails?.supplier || '-'}</TableCell>
                                                            <TableCell>
                                                                {Array.isArray(item1.sensorAssignments) && item1.sensorAssignments.length > 0
                                                                    ? item1.sensorAssignments.map(sa => `${sa.sensorName} (${sa.requiredQuantity})`).join(', ')
                                                                    : '-'}
                                                            </TableCell>
                                                            <TableCell>{item1.lastUpdated?.toLocaleString?.() || '-'}</TableCell>
                                                            <TableCell>
                                                                <IconButton color="primary" onClick={() => handleEditItem(item1)}>
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
                                    Add {activeTab === 0 ? 'Sensor' : 'Component'}
                                </Button>
                            </Box>
                        </>
                    )}
                </motion.div>
            </div>


            <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
                <DialogTitle>{editItem?.id ? 'Edit Item' : 'Add Inventory Item'}</DialogTitle>
                <DialogContent className="p-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            {activeTab === 0 ? (
                                <>
                                    <Select
                                        value={editItem ? (editItem as SenzorStockItem).senzorId || '' : ''}
                                        onChange={(e) => {
                                            const sensorId = Number(e.target.value);
                                            const selectedSensor = allSensors.find(s => s.id === sensorId);
                                            if (selectedSensor) {
                                                setEditItem({
                                                    ...editItem,
                                                    senzorId: selectedSensor.id,
                                                    sensorName: selectedSensor.sensorName
                                                } as SenzorStockItem);
                                            }
                                        }}
                                        label="Sensor"
                                        fullWidth
                                        required
                                        className="mb-4"
                                        displayEmpty
                                    >
                                        <MenuItem value="" disabled>Select a sensor</MenuItem>
                                        {allSensors.map(sensor => (
                                            <MenuItem key={sensor.id} value={sensor.id}>
                                                {sensor.sensorName}
                                            </MenuItem>
                                        ))}
                                    </Select>

                                    {/* Frequency dropdown for sensors */}
                                    <Select
                                        value={editItem && 'frequency' in editItem
                                            ? (editItem as SenzorStockItem).frequency || ''
                                            : ''}
                                        onChange={(e) => {
                                            if (!editItem) return;
                                            setEditItem({
                                                ...editItem,
                                                frequency: e.target.value as Frequency
                                            } as SenzorStockItem);
                                        }}
                                        label="Frequency"
                                        fullWidth
                                        required
                                        className="mb-4"
                                    >
                                        {frequencyOptions.map(freq => (
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
                                        value={'dev_eui' in (editItem ?? {}) ? (editItem as SenzorStockItem).dev_eui || '' : ''}
                                        onChange={(e) => editItem && setEditItem({
                                            ...editItem,
                                            dev_eui: e.target.value
                                        })}
                                        placeholder="Main Warehouse"
                                    />
                                </>
                            ) : (
                                <>
                                    <TextField
                                        autoFocus
                                        margin="dense"
                                        id="name"
                                        label="Component Name"
                                        type="text"
                                        fullWidth
                                        variant="outlined"
                                        value={(editItem as ComponentStockItem)?.name || ''}
                                        onChange={(e) => {
                                            if (!editItem) return;
                                            setEditItem({ ...editItem, name: e.target.value } as ComponentStockItem);
                                        }}
                                        className="mb-4"
                                    />

                                    {/* Contact Details */}
                                    <Typography variant="subtitle1" className="mt-4 mb-2">
                                        Supplier Contact
                                    </Typography>
                                    <TextField
                                        margin="dense"
                                        id="supplier"
                                        label="Supplier Name"
                                        type="text"
                                        fullWidth
                                        variant="outlined"
                                        value={(editItem as ComponentStockItem)?.contactDetails?.supplier || ''}
                                        onChange={(e) => {
                                            if (!editItem) return;
                                            setEditItem({
                                                ...editItem,
                                                contactDetails: {
                                                    ...(editItem as ComponentStockItem).contactDetails,
                                                    supplier: e.target.value
                                                }
                                            } as ComponentStockItem);
                                        }}
                                        className="mb-2"
                                    />
                                    <TextField
                                        margin="dense"
                                        id="email"
                                        label="Email"
                                        type="email"
                                        fullWidth
                                        variant="outlined"
                                        value={(editItem as ComponentStockItem)?.contactDetails?.email || ''}
                                        onChange={(e) => {
                                            if (!editItem) return;
                                            setEditItem({
                                                ...editItem,
                                                contactDetails: {
                                                    ...(editItem as ComponentStockItem).contactDetails,
                                                    email: e.target.value
                                                }
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
                                        value={(editItem as ComponentStockItem)?.contactDetails?.phone || ''}
                                        onChange={(e) => {
                                            if (!editItem) return;
                                            setEditItem({
                                                ...editItem,
                                                contactDetails: {
                                                    ...(editItem as ComponentStockItem).contactDetails,
                                                    phone: e.target.value
                                                }
                                            } as ComponentStockItem);
                                        }}
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
                                value={editItem?.quantity || 0}
                                onChange={(e) => editItem && setEditItem({
                                    ...editItem,
                                    quantity: parseInt(e.target.value) || 0
                                })}
                                className="mb-4 mt-4"
                            />

                            <TextField
                                margin="dense"
                                id="location"
                                label="Location"
                                type="text"
                                fullWidth
                                variant="outlined"
                                value={editItem?.location || ''}
                                onChange={(e) => editItem && setEditItem({
                                    ...editItem,
                                    location: e.target.value
                                })}
                                placeholder="Main Warehouse"
                            />

                        </div>

                        {activeTab === 1 && (
                            <div className="border-l pl-4">
                                <Typography variant="h6" className="mb-3">
                                    Assign to Sensors
                                </Typography>
                                <Typography variant="body2" color="textSecondary" className="mb-4">
                                    Specify how many of this component are needed for each sensor
                                </Typography>

                                <div className="mb-6">
                                    <Select
                                        multiple
                                        fullWidth
                                        value={sensorOptions.filter(opt => opt.selected).map(opt => opt.id)}
                                        onChange={(e) => {
                                            const selectedIds = e.target.value as number[];
                                            setSensorOptions(prev => prev.map(opt => ({
                                                ...opt,
                                                selected: selectedIds.includes(opt.id)
                                            })));
                                        }}
                                        renderValue={(selected) => (
                                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                                {(selected as number[]).map(id => {
                                                    const sensor = allSensors.find(s => s.id === id);
                                                    return sensor ? (
                                                        <Chip key={id} label={sensor.sensorName} />
                                                    ) : null;
                                                })}
                                            </Box>
                                        )}
                                    >
                                        {allSensors.map(sensor => (
                                            <MenuItem key={sensor.id} value={sensor.id}>
                                                {sensor.sensorName}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </div>

                                <div className="max-h-48 overflow-y-auto mb-6">
                                    {sensorOptions
                                        .filter(option => option.selected)
                                        .map(option => (
                                            <div key={option.id} className="flex items-center justify-between mb-3 p-2 bg-gray-50 rounded">
                                                <Typography>{option.name}</Typography>
                                                <TextField
                                                    size="small"
                                                    type="number"
                                                    label="Qty per sensor"
                                                    value={option.requiredQuantity}
                                                    onChange={(e) =>
                                                        handleRequiredQuantityChange(
                                                            option.id,
                                                            parseInt(e.target.value) || 1
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
                                    onChange={(e) => setInvoiceNumber(e.target.value)}
                                    className="mb-4"
                                    placeholder="Required for stock increases"
                                    required
                                />

                                <Typography variant="body2" color="textSecondary" className="mb-2">
                                    Or upload invoice file:
                                </Typography>
                                <div
                                    className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                                        }`}
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                    onClick={() => document.getElementById('invoice-upload')?.click()}
                                >
                                    <CloudUploadIcon className="text-4xl text-gray-400 mb-2" />
                                    {invoiceFile ? (
                                        <p className="text-green-600">{invoiceFile.name}</p>
                                    ) : (
                                        <>
                                            <p>Drag & drop an invoice file here</p>
                                            <p className="text-sm text-gray-500 mt-1">or click to browse</p>
                                        </>
                                    )}
                                    <input
                                        type="file"
                                        id="invoice-upload"
                                        className="hidden"
                                        accept=".pdf,.jpg,.jpeg,.png"
                                        onChange={handleFileChange}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose}>Cancel</Button>
                    <Button onClick={activeTab === 0 ? handleAddOrUpdateSensor : handleAddOrUpdateComponent}>{editItem?.id ? 'Update' : 'Add'} Item</Button>
                </DialogActions>
            </Dialog>


            <Dialog open={adjustmentDialogOpen} onClose={() => setAdjustmentDialogOpen(false)}>
                <DialogTitle>
                    {adjustmentType === 'increase' ? 'Increase Quantity' : 'Decrease Quantity'}
                </DialogTitle>
                <DialogContent>
                    {currentAdjustItem && (
                        <div className="mb-4">
                            <Typography variant="h6">
                                {'sensorName' in currentAdjustItem
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
                        label={adjustmentType === 'increase' ? 'Amount to Add' : 'Amount to Remove'}
                        type="number"
                        fullWidth
                        variant="outlined"
                        value={adjustmentQuantity}
                        onChange={(e) => setAdjustmentQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                        inputProps={{ min: 1 }}
                        className="mb-4"
                    />

                    <TextField
                        label={adjustmentType === 'increase'
                            ? 'Reason for increase (e.g. purchase reference)'
                            : 'Reason for decrease (required)'}
                        fullWidth
                        multiline
                        rows={3}
                        value={adjustmentReason}
                        onChange={(e) => setAdjustmentReason(e.target.value)}
                        required
                    />

                    {adjustmentType === 'increase' && currentAdjustItem && 'componentId' in currentAdjustItem && (
                        <div className="mt-4 p-3 bg-yellow-50 rounded">
                            <Typography variant="body2" color="textSecondary">
                                Note: Invoice number is required for component increases.
                                Please ensure you&apos;ve entered it in the item details.
                            </Typography>
                        </div>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAdjustmentDialogOpen(false)}>Cancel</Button>
                    <Button
                        onClick={confirmAdjustment}
                        disabled={!adjustmentReason}
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
                    sx={{ width: '100%' }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </ThemeProvider>
    );
}