"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  Alert,
  Box,
  Button,
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
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import {
  DeleteSensor,
  GetSensors,
  InsertSensor,
  UpdateorAddSenor,
} from "./backend";
import type { JsonValue } from "@prisma/client/runtime/library";

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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingSensor, setEditingSensor] = useState<FrontendSensor | null>(
    null,
  );
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error",
  });

  const {
    data: sensors,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["sensors"],
    queryFn: async () => {
      const data = await GetSensors();
      return data.map((sensor) => ({
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
        frequency: null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sensors"] });
      setSnackbar({
        open: true,
        message: "Sensor uspešno posodobljen!",
        severity: "success",
      });
      setOpen(false);
    },
    onError: () => {
      setSnackbar({
        open: true,
        message: "Napaka pri shranjevanju senzorja",
        severity: "error",
      });
    },
  });

  const insertMutation = useMutation({
    mutationFn: async (params: Omit<FrontendSensor, "id">) => {
      return InsertSensor({
        sensorName: params.sensorName,
        familyId: params.familyId,
        productId: params.productId,
        photograph: params.photograph || null,
        payloadDecoder: params.payloadDecoder || null,
        decoder: params.decoder !== undefined ? params.decoder : null,
        description: params.description || null,
        zpl: params.zpl || null,
        frequency: null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sensors"] });
      setSnackbar({
        open: true,
        message: "Sensor uspešno dodan!",
        severity: "success",
      });
      setOpen(false);
    },
    onError: () => {
      setSnackbar({
        open: true,
        message: "Napaka pri dodajanju senzorja",
        severity: "error",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: DeleteSensor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sensors"] });
      setSnackbar({
        open: true,
        message: "Sensor izbrisan!",
        severity: "success",
      });
    },
    onError: () => {
      setSnackbar({
        open: true,
        message: "Napaka pri brisanju senzorja",
        severity: "error",
      });
    },
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    const sensorData = {
      sensorName: formData.get("sensorName") as string,
      familyId: Number(formData.get("familyId")),
      productId: Number(formData.get("productId")),
      photograph: formData.get("photograph") as string,
      payloadDecoder: formData.get("payloadDecoder") as string,
      decoder: formData.get("decoder") as JsonValue,
      description: formData.get("description") as string,
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
    <Container maxWidth="xl" sx={{ py: { xs: 2, md: 4 } }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Box sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: { xs: 'stretch', md: 'center' },
          justifyContent: 'space-between',
          mb: { xs: 3, md: 4 },
          gap: { xs: 2, md: 0 }
        }}>
          <Typography
            variant={isMobile ? "h4" : "h3"}
            sx={{
              fontWeight: 'bold',
              color: 'primary.main',
              textAlign: { xs: 'center', md: 'left' }
            }}
          >
            Seznam senzorjev
          </Typography>

          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setEditingSensor(null);
              setOpen(true);
            }}
            size={isMobile ? "large" : "medium"}
            sx={{
              minWidth: { xs: '100%', md: 'auto' },
              py: { xs: 1.5, md: 1 }
            }}
          >
            Dodaj nov senzor
          </Button>
        </Box>

        <TableContainer
          component={Paper}
          elevation={3}
          sx={{
            borderRadius: 2,
            overflow: 'hidden',
            '& .MuiTable-root': {
              minWidth: { xs: 800, md: 'auto' }
            }
          }}
        >
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                {[
                  "ID",
                  "Ime senzorja",
                  "ID družine",
                  "ID produkta",
                  "Fotografija",
                  "Payload Decoder",
                  "Decoder",
                  "Opis",
                  "Akcije",
                ].map((header) => (
                  <TableCell
                    key={header}
                    sx={{
                      backgroundColor: 'primary.main',
                      color: 'primary.contrastText',
                      fontWeight: 600,
                      fontSize: { xs: '0.875rem', md: '1rem' }
                    }}
                  >
                    {header}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              <AnimatePresence>
                {sensors?.map((sensor) => (
                  <motion.tr
                    key={sensor.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <TableCell>{sensor.id}</TableCell>
                    <TableCell sx={{ fontWeight: 500 }}>{sensor.sensorName}</TableCell>
                    <TableCell>{sensor.familyId}</TableCell>
                    <TableCell>{sensor.productId}</TableCell>
                    <TableCell>{sensor.photograph}</TableCell>
                    <TableCell sx={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {sensor.payloadDecoder}
                    </TableCell>
                    <TableCell sx={{ maxWidth: '300px' }}>
                      <Box sx={{
                        maxHeight: 100,
                        overflow: 'auto',
                        fontSize: '0.75rem',
                        fontFamily: 'monospace',
                        backgroundColor: 'grey.50',
                        p: 1,
                        borderRadius: 1
                      }}>
                        {JSON.stringify(sensor.decoder, null, 2)}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ maxWidth: '200px' }}>{sensor.description}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <IconButton
                          onClick={() => {
                            setEditingSensor(sensor);
                            setOpen(true);
                          }}
                          color="primary"
                          size={isMobile ? "large" : "medium"}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          color="error"
                          onClick={() => deleteMutation.mutate(sensor.id)}
                          size={isMobile ? "large" : "medium"}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </TableBody>
          </Table>
        </TableContainer>
      </motion.div>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 2 }
        }}
      >
        <DialogTitle sx={{
          backgroundColor: 'primary.main',
          color: 'primary.contrastText',
          fontWeight: 600
        }}>
          {editingSensor ? "Uredi senzor" : "Dodaj nov senzor"}
        </DialogTitle>
        <DialogContent sx={{ p: { xs: 2, md: 3 } }}>
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, md: 3 } }}>
              <TextField
                fullWidth
                name="sensorName"
                label="Ime senzorja"
                defaultValue={editingSensor?.sensorName}
                required
              />
              <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' } }}>
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
              </Box>
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
                    fontFamily: "monospace",
                    fontSize: "0.8rem",
                    whiteSpace: "pre-wrap",
                  },
                }}
              />
              <TextField
                fullWidth
                name="decoder"
                label="Decoder (JSON)"
                defaultValue={
                  editingSensor?.decoder
                    ? JSON.stringify(editingSensor.decoder, null, 2)
                    : ""
                }
                multiline
                minRows={6}
                maxRows={12}
                helperText='Enter valid JSON (e.g., { "key": "value" })'
                InputProps={{
                  style: { fontFamily: "monospace" },
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
              <Button
                type="submit"
                variant="contained"
                fullWidth
                size="large"
                sx={{
                  py: { xs: 1.5, md: 2 },
                  fontSize: { xs: '1rem', md: '1.1rem' },
                  fontWeight: 600
                }}
              >
                {editingSensor ? "Shrani spremembe" : "Dodaj senzor"}
              </Button>
            </Box>
          </Box>
        </DialogContent>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
      >
        <Alert severity={snackbar.severity} sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}
