"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  Paper,
  Snackbar,
  Stack,
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
import type { Prisma } from "@prisma/client";

type FrontendSensor = {
  id: number;
  sensorName: string;
  familyId: number;
  productId: number;
  pricePerItem?: number | null;
  photograph?: string | null;
  payloadDecoder?: string | null;
  decoder?: Prisma.JsonValue;
  zpl?: string | null;
  description?: string | null;
};

// Columns definition used to drive the header AND keep header/body cells in
// sync. Widths are percentages that always sum to 100, so the table fills
// the available width exactly instead of overflowing it.
const COLUMNS = [
  { key: "id", label: "ID", width: "5%" },
  { key: "sensorName", label: "Ime senzorja", width: "14%" },
  { key: "familyId", label: "ID družine", width: "8%" },
  { key: "productId", label: "ID produkta", width: "8%" },
  { key: "photograph", label: "Fotografija", width: "10%" },
  { key: "payloadDecoder", label: "Payload Decoder", width: "14%" },
  { key: "decoder", label: "Decoder", width: "14%" },
  { key: "zpl", label: "ZPL", width: "11%" },
  { key: "description", label: "Opis", width: "10%" },
  { key: "actions", label: "Akcije", width: "6%" },
] as const;

function truncate(value: string, max: number) {
  return value.length > max ? `${value.substring(0, max)}...` : value;
}

export default function SensorList() {
  const theme = useTheme();
  // < md (tablets/phones) -> card layout
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  // < sm (phones) -> tighter dialog / typography tweaks
  const isSmall = useMediaQuery(theme.breakpoints.down("sm"));

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
      return data.map((sensor: FrontendSensor) => ({
        id: sensor.id,
        sensorName: sensor.sensorName,
        familyId: sensor.familyId,
        productId: sensor.productId,
        pricePerItem: sensor.pricePerItem,
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
    let decoderValue: Prisma.JsonValue = null;
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

  const openEdit = (sensor: FrontendSensor) => {
    setEditingSensor(sensor);
    setOpen(true);
  };

  return (
    <Container maxWidth={false} sx={{ py: { xs: 2, md: 4 } }}>
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

        {/* ---------- MOBILE / TABLET: card layout ---------- */}
        {isMobile ? (
          <Stack spacing={2}>
            <AnimatePresence>
              {sensors?.map((sensor: FrontendSensor) => (
                <motion.div
                  key={sensor.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <Paper
                    elevation={2}
                    onClick={() => openEdit(sensor)}
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      display: "flex",
                      flexDirection: "column",
                      gap: 1,
                      cursor: "pointer",
                      transition: "background-color 0.2s",
                      "&:hover": {
                        backgroundColor: "grey.50",
                      },
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: 1,
                      }}
                    >
                      <Box sx={{ minWidth: 0 }}>
                        <Typography
                          variant="subtitle1"
                          sx={{
                            fontWeight: 600,
                            wordBreak: "break-word",
                          }}
                        >
                          {sensor.sensorName}
                        </Typography>
                        <Stack
                          direction="row"
                          spacing={1}
                          sx={{ mt: 0.5, flexWrap: "wrap", rowGap: 0.5 }}
                        >
                          <Chip size="small" label={`ID: ${sensor.id}`} />
                          <Chip
                            size="small"
                            label={`Družina: ${sensor.familyId}`}
                          />
                          <Chip
                            size="small"
                            label={`Produkt: ${sensor.productId}`}
                          />
                        </Stack>
                      </Box>
                      <Box sx={{ display: "flex", flexShrink: 0 }}>
                        <IconButton
                          onClick={(e) => {
                            e.stopPropagation();
                            openEdit(sensor);
                          }}
                          color="primary"
                          size="small"
                          title="Uredi senzor"
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          color="error"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteMutation.mutate(sensor.id);
                          }}
                          size="small"
                          title="Izbriši senzor"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </Box>

                    {sensor.description && (
                      <Typography variant="body2" color="text.secondary">
                        {sensor.description}
                      </Typography>
                    )}

                    {(sensor.payloadDecoder || sensor.decoder || sensor.zpl) && (
                      <Stack spacing={0.75} sx={{ mt: 0.5 }}>
                        {sensor.payloadDecoder && (
                          <Box
                            sx={{
                              fontFamily: "monospace",
                              fontSize: "0.7rem",
                              backgroundColor: "grey.50",
                              border: "1px solid",
                              borderColor: "grey.300",
                              borderRadius: 1,
                              p: 0.75,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                            title={sensor.payloadDecoder}
                          >
                            Payload: {truncate(sensor.payloadDecoder, 40)}
                          </Box>
                        )}
                        {sensor.decoder != null && (
                          <Box
                            sx={{
                              fontFamily: "monospace",
                              fontSize: "0.7rem",
                              backgroundColor: "grey.50",
                              border: "1px solid",
                              borderColor: "grey.300",
                              borderRadius: 1,
                              p: 0.75,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                            title={JSON.stringify(sensor.decoder, null, 2)}
                          >
                            Decoder: {truncate(JSON.stringify(sensor.decoder), 40)}
                          </Box>
                        )}
                        {sensor.zpl && (
                          <Box
                            sx={{
                              fontFamily: "monospace",
                              fontSize: "0.7rem",
                              backgroundColor: "grey.50",
                              border: "1px solid",
                              borderColor: "grey.300",
                              borderRadius: 1,
                              p: 0.75,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                            title={sensor.zpl}
                          >
                            ZPL: {truncate(sensor.zpl, 40)}
                          </Box>
                        )}
                      </Stack>
                    )}
                  </Paper>
                </motion.div>
              ))}
            </AnimatePresence>
          </Stack>
        ) : (
          /* ---------- DESKTOP: full table, fills page width exactly ---------- */
          <TableContainer
            component={Paper}
            elevation={3}
            sx={{
              borderRadius: 2,
              overflowX: "hidden",
              overflowY: "auto",
              maxHeight: "70vh",
              width: "100%",
            }}
          >
            <Table stickyHeader sx={{ tableLayout: "fixed", width: "100%" }}>
              <TableHead>
                <TableRow>
                  {COLUMNS.map((header) => (
                    <TableCell
                      key={header.key}
                      sx={{
                        // Force white text regardless of MUI sticky-header
                        // color overrides / theme contrastText quirks.
                        backgroundColor: `${theme.palette.primary.main} !important`,
                        color: "#fff !important",
                        fontWeight: 600,
                        fontSize: { xs: "0.8rem", md: "0.9rem", lg: "1rem" },
                        width: header.width,
                        position: "sticky",
                        top: 0,
                        zIndex: 10,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {header.label}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                <AnimatePresence>
                  {sensors?.map((sensor: FrontendSensor) => (
                    <motion.tr
                      key={sensor.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.3 }}
                      onClick={() => openEdit(sensor)}
                      whileHover={{
                        backgroundColor: theme.palette.action.hover,
                      }}
                      style={{ cursor: "pointer" }}
                    >
                      <TableCell sx={{ width: COLUMNS[0].width }}>
                        {sensor.id}
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: 500,
                          width: COLUMNS[1].width,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {sensor.sensorName}
                      </TableCell>
                      <TableCell sx={{ width: COLUMNS[2].width }}>
                        {sensor.familyId}
                      </TableCell>
                      <TableCell sx={{ width: COLUMNS[3].width }}>
                        {sensor.productId}
                      </TableCell>
                      <TableCell
                        sx={{
                          width: COLUMNS[4].width,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
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
                            {truncate(sensor.photograph, 20)}
                          </Box>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell
                        sx={{
                          width: COLUMNS[5].width,
                          overflow: "hidden",
                        }}
                      >
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
                            }}
                            title={sensor.payloadDecoder}
                          >
                            {truncate(sensor.payloadDecoder, 30)}
                          </Box>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell
                        sx={{
                          width: COLUMNS[6].width,
                          overflow: "hidden",
                        }}
                      >
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
                            }}
                            title={JSON.stringify(sensor.decoder, null, 2)}
                          >
                            {truncate(JSON.stringify(sensor.decoder), 30)}
                          </Box>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell
                        sx={{
                          width: COLUMNS[7].width,
                          overflow: "hidden",
                        }}
                      >
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
                            }}
                            title={sensor.zpl}
                          >
                            {truncate(sensor.zpl, 30)}
                          </Box>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell
                        sx={{
                          width: COLUMNS[8].width,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {sensor.description ? (
                          <Box
                            sx={{
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                            title={sensor.description}
                          >
                            {truncate(sensor.description, 25)}
                          </Box>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell sx={{ width: COLUMNS[9].width }}>
                        <Box
                          sx={{
                            display: "flex",
                            gap: 0.5,
                            justifyContent: "center",
                          }}
                        >
                          <IconButton
                            onClick={(e) => {
                              e.stopPropagation();
                              openEdit(sensor);
                            }}
                            color="primary"
                            size="small"
                            title="Uredi senzor"
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            color="error"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteMutation.mutate(sensor.id);
                            }}
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
        )}
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
            color: "#fff",
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
                  minRows={isSmall ? 4 : 6}
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
                  minRows={isSmall ? 5 : 8}
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
                  minRows={isSmall ? 4 : 6}
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