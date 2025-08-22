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
  pricePerItem?: number | null;
  photograph?: string | null;
  payloadDecoder?: string | null;
  decoder?: JsonValue;
  zpl?: string | null;
  description?: string | null;
};

export default function SensorList() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

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
        frequency: sensor.pricePerItem,
        photograph: sensor.photograph,
        payloadDecoder: sensor.payloadDecoder,
        decoder: sensor.decoder,
        zpl: sensor.zpl,
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
        pricePerItem: params.pricePerItem || null,
        photograph: params.photograph || null,
        payloadDecoder: params.payloadDecoder || null,
        decoder: params.decoder !== undefined ? params.decoder : null,
        zpl: params.zpl || null,
        description: params.description || null,
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
        pricePerItem: params.pricePerItem || null,
        photograph: params.photograph || null,
        payloadDecoder: params.payloadDecoder || null,
        decoder: params.decoder !== undefined ? params.decoder : null,
        zpl: params.zpl || null,
        description: params.description || null,
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

    // Parse JSON decoder field
    let decoderValue: JsonValue = null;
    const decoderString = formData.get("decoder") as string;
    if (decoderString?.trim()) {
      try {
        decoderValue = JSON.parse(decoderString);
      } catch {
        setSnackbar({
          open: true,
          message: "Nepravilna JSON sintaksa v polju Decoder",
          severity: "error",
        });
        return;
      }
    }

    const sensorData = {
      sensorName: formData.get("sensorName") as string,
      familyId: Number(formData.get("familyId")),
      productId: Number(formData.get("productId")),
      frequency: formData.get("frequency") as string,
      photograph: formData.get("photograph") as string,
      payloadDecoder: formData.get("payloadDecoder") as string,
      decoder: decoderValue,
      zpl: formData.get("zpl") as string,
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
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            alignItems: { xs: "stretch", md: "center" },
            justifyContent: "space-between",
            mb: { xs: 3, md: 4 },
            gap: { xs: 2, md: 0 },
          }}
        >
          <Typography
            variant={isMobile ? "h4" : "h3"}
            sx={{
              fontWeight: "bold",
              color: "primary.main",
              textAlign: { xs: "center", md: "left" },
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
              minWidth: { xs: "100%", md: "auto" },
              py: { xs: 1.5, md: 1 },
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
            overflow: "auto",
            maxHeight: "70vh",
          }}
        >
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                {[
                  { label: "ID", minWidth: 60 },
                  { label: "Ime senzorja", minWidth: 150 },
                  { label: "ID družine", minWidth: 100 },
                  { label: "ID produkta", minWidth: 100 },
                  { label: "Frekvenca", minWidth: 120 },
                  { label: "Fotografija", minWidth: 140 },
                  { label: "Payload Decoder", minWidth: 180 },
                  { label: "Decoder", minWidth: 180 },
                  { label: "ZPL", minWidth: 180 },
                  { label: "Opis", minWidth: 140 },
                  { label: "Akcije", minWidth: 100 },
                ].map((header) => (
                  <TableCell
                    key={header.label}
                    sx={{
                      backgroundColor: "primary.main",
                      color: "primary.contrastText",
                      fontWeight: 600,
                      fontSize: { xs: "0.875rem", md: "1rem" },
                      minWidth: header.minWidth,
                      position: "sticky",
                      top: 0,
                      zIndex: 10,
                    }}
                  >
                    {header.label}
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
                    <TableCell sx={{ minWidth: 60 }}>{sensor.id}</TableCell>
                    <TableCell
                      sx={{
                        fontWeight: 500,
                        minWidth: 150,
                        maxWidth: 200,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {sensor.sensorName}
                    </TableCell>
                    <TableCell sx={{ minWidth: 100 }}>
                      {sensor.familyId}
                    </TableCell>
                    <TableCell sx={{ minWidth: 100 }}>
                      {sensor.productId}
                    </TableCell>
                    <TableCell
                      sx={{
                        minWidth: 120,
                        maxWidth: 150,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {sensor.frequency || "-"}
                    </TableCell>
                    <TableCell sx={{ minWidth: 140, maxWidth: 180 }}>
                      {sensor.photograph ? (
                        <Box
                          sx={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            fontSize: "0.75rem",
                          }}
                          title={sensor.photograph}
                        >
                          {sensor.photograph.length > 20
                            ? `${sensor.photograph.substring(0, 20)}...`
                            : sensor.photograph}
                        </Box>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell sx={{ minWidth: 180, maxWidth: 220 }}>
                      {sensor.payloadDecoder ? (
                        <Box
                          sx={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            fontSize: "0.75rem",
                            fontFamily: "monospace",
                            backgroundColor: "grey.50",
                            p: 0.5,
                            borderRadius: 1,
                            border: "1px solid",
                            borderColor: "grey.300",
                            cursor: "pointer",
                            "&:hover": {
                              backgroundColor: "grey.100",
                            },
                          }}
                          title={sensor.payloadDecoder}
                        >
                          {sensor.payloadDecoder.length > 30
                            ? `${sensor.payloadDecoder.substring(0, 30)}...`
                            : sensor.payloadDecoder}
                        </Box>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell sx={{ minWidth: 180, maxWidth: 220 }}>
                      {sensor.decoder ? (
                        <Box
                          sx={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            fontSize: "0.75rem",
                            fontFamily: "monospace",
                            backgroundColor: "grey.50",
                            p: 0.5,
                            borderRadius: 1,
                            border: "1px solid",
                            borderColor: "grey.300",
                            cursor: "pointer",
                            "&:hover": {
                              backgroundColor: "grey.100",
                            },
                          }}
                          title={JSON.stringify(sensor.decoder, null, 2)}
                        >
                          {JSON.stringify(sensor.decoder).length > 30
                            ? `${JSON.stringify(sensor.decoder).substring(0, 30)}...`
                            : JSON.stringify(sensor.decoder)}
                        </Box>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell sx={{ minWidth: 180, maxWidth: 220 }}>
                      {sensor.zpl ? (
                        <Box
                          sx={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            fontSize: "0.75rem",
                            fontFamily: "monospace",
                            backgroundColor: "grey.50",
                            p: 0.5,
                            borderRadius: 1,
                            border: "1px solid",
                            borderColor: "grey.300",
                            cursor: "pointer",
                            "&:hover": {
                              backgroundColor: "grey.100",
                            },
                          }}
                          title={sensor.zpl}
                        >
                          {sensor.zpl.length > 30
                            ? `${sensor.zpl.substring(0, 30)}...`
                            : sensor.zpl}
                        </Box>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell sx={{ minWidth: 140, maxWidth: 180 }}>
                      {sensor.description ? (
                        <Box
                          sx={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                          title={sensor.description}
                        >
                          {sensor.description.length > 25
                            ? `${sensor.description.substring(0, 25)}...`
                            : sensor.description}
                        </Box>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell sx={{ minWidth: 100 }}>
                      <Box
                        sx={{
                          display: "flex",
                          gap: 0.5,
                          justifyContent: "center",
                        }}
                      >
                        <IconButton
                          onClick={() => {
                            setEditingSensor(sensor);
                            setOpen(true);
                          }}
                          color="primary"
                          size="small"
                          title="Uredi senzor"
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          color="error"
                          onClick={() => deleteMutation.mutate(sensor.id)}
                          size="small"
                          title="Izbriši senzor"
                        >
                          <DeleteIcon fontSize="small" />
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
        maxWidth="xl"
        fullWidth
        fullScreen={isMobile}
        PaperProps={{
          sx: {
            borderRadius: isMobile ? 0 : 2,
            maxHeight: "95vh",
          },
        }}
      >
        <DialogTitle
          sx={{
            backgroundColor: "primary.main",
            color: "primary.contrastText",
            fontWeight: 600,
          }}
        >
          {editingSensor ? "Uredi senzor" : "Dodaj nov senzor"}
        </DialogTitle>
        <DialogContent sx={{ p: { xs: 2, md: 3 } }}>
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: { xs: 2, md: 3 },
              }}
            >
              {/* Basic Information */}
              <Typography variant="h6" color="primary" sx={{ mb: 1 }}>
                Osnovne informacije
              </Typography>

              <TextField
                fullWidth
                name="sensorName"
                label="Ime senzorja"
                defaultValue={editingSensor?.sensorName}
                required
              />

              <Box
                sx={{
                  display: "flex",
                  gap: 2,
                  flexDirection: { xs: "column", md: "row" },
                }}
              >
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
                name="pricePerItem"
                label="Cena na enoto"
                defaultValue={editingSensor?.pricePerItem}
                placeholder="npr. 12.99"
                type="number"
                inputProps={{ step: 0.01 }}
              />

              <TextField
                fullWidth
                name="photograph"
                label="URL fotografije"
                defaultValue={editingSensor?.photograph}
                placeholder="https://example.com/image.jpg"
              />

              <TextField
                fullWidth
                name="description"
                label="Opis"
                defaultValue={editingSensor?.description}
                multiline
                rows={3}
                placeholder="Opis senzorja..."
              />

              {/* Technical Information */}
              <Typography variant="h6" color="primary" sx={{ mt: 2, mb: 1 }}>
                Tehnične informacije
              </Typography>

              <Box sx={{ position: "relative" }}>
                <TextField
                  fullWidth
                  name="payloadDecoder"
                  label="Payload Decoder"
                  defaultValue={editingSensor?.payloadDecoder}
                  multiline
                  minRows={6}
                  maxRows={12}
                  placeholder="function decode(payload) {&#10;  // Your decoder logic here&#10;  return {};&#10;}"
                  inputProps={{
                    maxLength: 10000,
                    style: {
                      fontFamily: "Fira Code, Monaco, Consolas, monospace",
                      fontSize: "0.875rem",
                      lineHeight: 1.5,
                      whiteSpace: "pre-wrap",
                    },
                  }}
                  sx={{
                    "& .MuiInputBase-root": {
                      backgroundColor: "grey.50",
                    },
                  }}
                />
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mt: 0.5, display: "block" }}
                >
                  JavaScript koda za dekodiranje payload-a
                </Typography>
              </Box>

              <Box sx={{ position: "relative" }}>
                <TextField
                  fullWidth
                  name="decoder"
                  label="Decoder Configuration (JSON)"
                  defaultValue={
                    editingSensor?.decoder
                      ? JSON.stringify(editingSensor.decoder, null, 2)
                      : ""
                  }
                  multiline
                  minRows={8}
                  maxRows={16}
                  placeholder='{&#10;  "type": "lorawan",&#10;  "version": "1.0",&#10;  "parameters": {&#10;    "key": "value"&#10;  }&#10;}'
                  InputProps={{
                    style: {
                      fontFamily: "Fira Code, Monaco, Consolas, monospace",
                      fontSize: "0.875rem",
                      lineHeight: 1.5,
                    },
                  }}
                  sx={{
                    "& .MuiInputBase-root": {
                      backgroundColor: "grey.50",
                    },
                  }}
                />
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mt: 0.5, display: "block" }}
                >
                  JSON konfiguracija za decoder (pustite prazno za null)
                </Typography>
              </Box>

              <Box sx={{ position: "relative" }}>
                <TextField
                  fullWidth
                  name="zpl"
                  label="ZPL Template"
                  defaultValue={editingSensor?.zpl}
                  multiline
                  minRows={6}
                  maxRows={12}
                  placeholder="^XA&#10;^FO50,50^A0N,50,50^FDSenzor: {sensorName}^FS&#10;^XZ"
                  InputProps={{
                    style: {
                      fontFamily: "Fira Code, Monaco, Consolas, monospace",
                      fontSize: "0.875rem",
                      lineHeight: 1.5,
                    },
                  }}
                  sx={{
                    "& .MuiInputBase-root": {
                      backgroundColor: "grey.50",
                    },
                  }}
                />
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mt: 0.5, display: "block" }}
                >
                  ZPL template za tiskanje etiket
                </Typography>
              </Box>

              <Button
                type="submit"
                variant="contained"
                fullWidth
                size="large"
                sx={{
                  py: { xs: 1.5, md: 2 },
                  fontSize: { xs: "1rem", md: "1.1rem" },
                  fontWeight: 600,
                  mt: 2,
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
