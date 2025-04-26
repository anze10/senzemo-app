'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import {
    Table, TableBody, TableCell, TableHead, TableRow, TableContainer, Paper,
    Button, TextField, Dialog, DialogContent, DialogTitle,
    IconButton, Snackbar, Alert, Typography, Box,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { UpdateorAddSenor, DeleteSensor, GetSensors, InsertSensor } from './backend';
import { JsonValue } from '@prisma/client/runtime/library';

const theme = createTheme({
    palette: {
        primary: { main: '#3f51b5' },
        secondary: { main: '#9c27b0' },
    },
});

type FrontendSensor = {
    id: number;
    sensorName: string;
    familyId: number;
    productId: number;
    photograph?: string | null;
    payloadDecoder?: string | null;
    decoder?: JsonValue;
    description?: string | null;
    zpl?: string | null;
};

export default function SensorList() {
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);
    const [editingSensor, setEditingSensor] = useState<FrontendSensor | null>(null);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

    const { data: sensors, isLoading, isError } = useQuery({
        queryKey: ['sensors'],
        queryFn: async () => {
            const data = await GetSensors();
            return data.map(sensor => ({
                id: sensor.id,
                sensorName: sensor.sensorName,
                familyId: sensor.familyId,
                productId: sensor.productId,
                photograph: sensor.photograph,
                payloadDecoder: sensor.payloadDecoder,
                decoder: sensor.decoder,
                description: sensor.description,
            }));
        },
    });

    const updateMutation = useMutation({
        mutationFn: async (params: FrontendSensor) => {
            return UpdateorAddSenor({
                id: params.id,
                sensorName: params.sensorName,
                familyId: params.familyId,
                productId: params.productId,
                photograph: params.photograph || null,
                payloadDecoder: params.payloadDecoder || null,
                decoder: params.decoder !== undefined ? params.decoder : null,
                description: params.description || null,
                zpl: params.zpl || null,
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sensors'] });
            setSnackbar({ open: true, message: 'Sensor uspešno posodobljen!', severity: 'success' });
            setOpen(false);
        },
        onError: () => {
            setSnackbar({ open: true, message: 'Napaka pri shranjevanju senzorja', severity: 'error' });
        }
    });

    const insertMutation = useMutation({
        mutationFn: async (params: Omit<FrontendSensor, 'id'>) => {
            return InsertSensor({
                sensorName: params.sensorName,
                familyId: params.familyId,
                productId: params.productId,
                photograph: params.photograph || null,
                payloadDecoder: params.payloadDecoder || null,
                decoder: params.decoder !== undefined ? params.decoder : null,
                description: params.description || null,
                zpl: params.zpl || null,
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sensors'] });
            setSnackbar({ open: true, message: 'Sensor uspešno dodan!', severity: 'success' });
            setOpen(false);
        },
        onError: () => {
            setSnackbar({ open: true, message: 'Napaka pri dodajanju senzorja', severity: 'error' });
        }
    });

    const deleteMutation = useMutation({
        mutationFn: DeleteSensor,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sensors'] });
            setSnackbar({ open: true, message: 'Sensor izbrisan!', severity: 'success' });
        },
        onError: () => {
            setSnackbar({ open: true, message: 'Napaka pri brisanju senzorja', severity: 'error' });
        }
    });

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);

        const sensorData = {
            sensorName: formData.get('sensorName') as string,
            familyId: Number(formData.get('familyId')),
            productId: Number(formData.get('productId')),
            photograph: formData.get('photograph') as string,
            payloadDecoder: formData.get('payloadDecoder') as string,
            decoder: formData.get('decoder') as JsonValue,
            description: formData.get('description') as string,
        };

        if (editingSensor) {
            updateMutation.mutate({ ...sensorData, id: editingSensor.id });
        } else {
            insertMutation.mutate(sensorData);
        }
    };

    if (isLoading) return <div>Nalaganje...</div>;
    if (isError) return <div>Napaka pri nalaganju senzorjev</div>;

    return (
        <ThemeProvider theme={theme}>
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-8">
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="max-w-7xl mx-auto">
                    <Box className="flex justify-between items-center mb-8">
                        <Typography variant="h3" className="text-purple-700 font-bold">Seznam senzorjev</Typography>
                        <Button variant="contained" startIcon={<AddIcon />} onClick={() => {
                            setEditingSensor(null);
                            setOpen(true);
                        }}>
                            Dodaj nov senzor
                        </Button>
                    </Box>

                    <TableContainer component={Paper} elevation={3}>
                        <Table>
                            <TableHead>
                                <TableRow style={{ background: 'linear-gradient(to right, #3f51b5, #9c27b0)' }}>
                                    {['ID', 'Ime senzorja', 'ID družine', 'ID produkta', 'Fotografija', 'Payload Decoder', 'Decoder', 'Opis', 'Akcije'].map((header) => (
                                        <TableCell key={header} style={{ color: 'white' }}>{header}</TableCell>
                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                <AnimatePresence>
                                    {sensors?.map((sensor) => (
                                        <motion.tr key={sensor.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                            <TableCell>{sensor.id}</TableCell>
                                            <TableCell>{sensor.sensorName}</TableCell>
                                            <TableCell>{sensor.familyId}</TableCell>
                                            <TableCell>{sensor.productId}</TableCell>
                                            <TableCell>{sensor.photograph}</TableCell>
                                            <TableCell className="break-all max-w-xs">{sensor.payloadDecoder}</TableCell>
                                            <TableCell className="max-w-xl">
                                                <pre className="text-xs overflow-auto max-h-32">
                                                    {JSON.stringify(sensor.decoder, null, 2)}
                                                </pre>
                                            </TableCell>
                                            <TableCell>{sensor.description}</TableCell>
                                            <TableCell>
                                                <IconButton onClick={() => {
                                                    setEditingSensor(sensor);
                                                    setOpen(true);
                                                }}>
                                                    <EditIcon />
                                                </IconButton>
                                                <IconButton onClick={() => deleteMutation.mutate(sensor.id)}>
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

                <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
                    <DialogTitle>{editingSensor ? 'Uredi senzor' : 'Dodaj nov senzor'}</DialogTitle>
                    <DialogContent>
                        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                            <TextField
                                fullWidth
                                name="sensorName"
                                label="Ime senzorja"
                                defaultValue={editingSensor?.sensorName}
                                required
                            />
                            <TextField
                                fullWidth
                                name="familyId"
                                label="ID družine"
                                type="number"
                                defaultValue={editingSensor?.familyId}
                                required
                            />
                            <TextField
                                fullWidth
                                name="productId"
                                label="ID produkta"
                                type="number"
                                defaultValue={editingSensor?.productId}
                                required
                            />
                            <TextField
                                fullWidth
                                name="photograph"
                                label="URL fotografije"
                                defaultValue={editingSensor?.photograph}
                            />
                            <TextField
                                fullWidth
                                name="payloadDecoder"
                                label="Payload Decoder"
                                defaultValue={editingSensor?.payloadDecoder}
                                multiline
                                minRows={4}
                                maxRows={8}
                                inputProps={{
                                    maxLength: 5000,
                                    style: {
                                        fontFamily: 'monospace',
                                        fontSize: '0.8rem',
                                        whiteSpace: 'pre-wrap'
                                    }
                                }}
                            />
                            <TextField
                                fullWidth
                                name="decoder"
                                label="Decoder (JSON)"
                                defaultValue={editingSensor?.decoder ? JSON.stringify(editingSensor.decoder, null, 2) : ''}
                                multiline
                                minRows={6}
                                maxRows={12}
                                helperText='Enter valid JSON (e.g., { "key": "value" })'
                                InputProps={{
                                    style: { fontFamily: 'monospace' },
                                }}
                            />
                            <TextField
                                fullWidth
                                name="description"
                                label="Opis"
                                defaultValue={editingSensor?.description}
                                multiline
                                rows={3}
                            />
                            <Button type="submit" variant="contained" fullWidth size="large">
                                {editingSensor ? 'Shrani spremembe' : 'Dodaj senzor'}
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>

                <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}>
                    <Alert severity={snackbar.severity} sx={{ width: '100%' }}>
                        {snackbar.message}
                    </Alert>
                </Snackbar>
            </div>
        </ThemeProvider>
    );
}