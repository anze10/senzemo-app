"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import Image from "next/image";
import {
    Alert,
    Box,
    Button,
    Chip,
    Collapse,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    MenuItem,
    Paper,
    Select,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
} from "@mui/material";
import {
    banUserAction,
    inviteUser,
    listUsersAction,
    listUserSessionsAction,
    removeUserAction,
    resendPasswordResetAction,
    setRoleAction,
    unbanUserAction,
} from "src/app/admin/components/adminactions";
import { BackButton } from "~/app/components/BackButton";

interface AdminUser {
    id: string;
    name: string;
    email: string;
    role: string | null;
    banned: boolean | null;
    banReason: string | null;
    createdAt: string | Date;
}

interface UserSession {
    id: string;
    createdAt: string | Date;
    ipAddress?: string | null;
    userAgent?: string | null;
}

export default function AdminConsole() {
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [total, setTotal] = useState(0);
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
    const [, setIsLoading] = useState(false);

    // Add user dialog
    const [addOpen, setAddOpen] = useState(false);
    const [newEmail, setNewEmail] = useState("");
    const [newName, setNewName] = useState("");
    const [newRole, setNewRole] = useState<"user" | "admin">("user");

    // Sessions expand
    const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
    const [sessions, setSessions] = useState<UserSession[]>([]);

    const loadUsers = useCallback(async () => {
        setIsLoading(true);
        try {
            const result = await listUsersAction({ searchValue: search || undefined });
            setUsers((result.users as unknown as AdminUser[]) ?? []);
            setTotal(result.total ?? 0);
        } catch (err) {
            setStatus({ type: "error", message: `Napaka pri nalaganju: ${(err as Error).message}` });
        } finally {
            setIsLoading(false);
        }
    }, [search]);

    useEffect(() => {
        void loadUsers();
    }, [loadUsers]);

    async function handleAddUser(e: React.FormEvent) {
        e.preventDefault();
        try {
            await inviteUser(newEmail, newName, newRole);
            setStatus({ type: "success", message: `Uporabnik ${newEmail} ustvarjen, email poslan.` });
            setAddOpen(false);
            setNewEmail("");
            setNewName("");
            setNewRole("user");
            void loadUsers();
        } catch (err) {
            setStatus({ type: "error", message: `Napaka: ${(err as Error).message}` });
        }
    }

    async function handleResendReset(email: string) {
        try {
            await resendPasswordResetAction(email);
            setStatus({ type: "success", message: `Email za reset gesla ponovno poslan na ${email}.` });
        } catch (err) {
            setStatus({ type: "error", message: `Napaka: ${(err as Error).message}` });
        }
    }

    async function handleRoleChange(userId: string, role: "user" | "admin") {
        try {
            await setRoleAction(userId, role);
            setStatus({ type: "success", message: "Vloga posodobljena." });
            void loadUsers();
        } catch (err) {
            setStatus({ type: "error", message: `Napaka: ${(err as Error).message}` });
        }
    }

    async function handleToggleBan(user: AdminUser) {
        try {
            if (user.banned) {
                await unbanUserAction(user.id);
                setStatus({ type: "success", message: `${user.email} odblokiran.` });
            } else {
                const reason = window.prompt("Razlog za blokado (opcijsko):") ?? undefined;
                await banUserAction(user.id, reason);
                setStatus({ type: "success", message: `${user.email} blokiran.` });
            }
            void loadUsers();
        } catch (err) {
            setStatus({ type: "error", message: `Napaka: ${(err as Error).message}` });
        }
    }

    async function handleRemove(user: AdminUser) {
        if (!window.confirm(`Res želiš TRAJNO izbrisati uporabnika ${user.email}?`)) return;
        try {
            await removeUserAction(user.id);
            setStatus({ type: "success", message: `${user.email} izbrisan.` });
            void loadUsers();
        } catch (err) {
            setStatus({ type: "error", message: `Napaka: ${(err as Error).message}` });
        }
    }

    async function handleToggleSessions(userId: string) {
        if (expandedUserId === userId) {
            setExpandedUserId(null);
            return;
        }
        try {
            const result = await listUserSessionsAction(userId);
            setSessions((result as unknown as { sessions: UserSession[] }).sessions ?? []);
            setExpandedUserId(userId);
        } catch (err) {
            setStatus({ type: "error", message: `Napaka pri nalaganju sej: ${(err as Error).message}` });
        }
    }

    return (
        <>
            {/* Mali logo + BackButton v zgornjem levem kotu - konsistentno
                s /parametrs in /konec, brez Navbar (namenska podstran) */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, pl: 2, pt: 2 }}>
                <Image src="/senzemo-logo.svg" alt="Senzemo" width={90} height={24} />
            </Box>

            <Box sx={{ maxWidth: 1300, mx: "auto", px: { xs: 2, md: 3 }, py: 3 }}>
                <BackButton fallbackHref="/dashboard" />
                <Typography variant="h4" fontWeight={700} gutterBottom>
                    Upravljanje uporabnikov
                </Typography>

                {status && (
                    <Alert severity={status.type} sx={{ mb: 2 }} onClose={() => setStatus(null)}>
                        {status.message}
                    </Alert>
                )}

                <Box sx={{ display: "flex", gap: 2, mb: 2, alignItems: "center" }}>
                    <TextField
                        label="Išči po emailu"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        size="small"
                    />
                    <Button variant="contained" onClick={() => setAddOpen(true)}>
                        + Dodaj uporabnika
                    </Button>
                    <Typography variant="body2" color="text.secondary">
                        Skupaj: {total}
                    </Typography>
                </Box>

                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Ime</TableCell>
                                <TableCell>Email</TableCell>
                                <TableCell>Vloga</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Ustvarjen</TableCell>
                                <TableCell align="right">Akcije</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {users.map((user) => (
                                <Fragment key={user.id}>
                                    <TableRow>
                                        <TableCell>{user.name}</TableCell>
                                        <TableCell>{user.email}</TableCell>
                                        <TableCell>
                                            <Select
                                                value={user.role ?? "user"}
                                                size="small"
                                                onChange={(e) =>
                                                    handleRoleChange(user.id, e.target.value as "user" | "admin")
                                                }
                                            >
                                                <MenuItem value="user">Uporabnik</MenuItem>
                                                <MenuItem value="admin">Administrator</MenuItem>
                                            </Select>
                                        </TableCell>
                                        <TableCell>
                                            {user.banned ? (
                                                <Chip label="Blokiran" color="error" size="small" />
                                            ) : (
                                                <Chip label="Aktiven" color="success" size="small" />
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {new Date(user.createdAt).toLocaleDateString("sl-SI")}
                                        </TableCell>
                                        <TableCell align="right">
                                            <Button size="small" onClick={() => handleResendReset(user.email)}>
                                                Reset gesla
                                            </Button>
                                            <Button size="small" onClick={() => handleToggleBan(user)}>
                                                {user.banned ? "Odblokiraj" : "Blokiraj"}
                                            </Button>
                                            <Button size="small" onClick={() => handleToggleSessions(user.id)}>
                                                Seje
                                            </Button>
                                            <Button size="small" color="error" onClick={() => handleRemove(user)}>
                                                Izbriši
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell colSpan={6} sx={{ p: 0, border: 0 }}>
                                            <Collapse in={expandedUserId === user.id}>
                                                <Box sx={{ p: 2, backgroundColor: "grey.50" }}>
                                                    <Typography variant="subtitle2" gutterBottom>
                                                        Aktivne seje (prijave)
                                                    </Typography>
                                                    {sessions.length === 0 ? (
                                                        <Typography variant="body2" color="text.secondary">
                                                            Ni aktivnih sej.
                                                        </Typography>
                                                    ) : (
                                                        sessions.map((s) => (
                                                            <Typography key={s.id} variant="body2">
                                                                {new Date(s.createdAt).toLocaleString("sl-SI")} — IP:{" "}
                                                                {s.ipAddress ?? "neznano"} — {s.userAgent ?? ""}
                                                            </Typography>
                                                        ))
                                                    )}
                                                </Box>
                                            </Collapse>
                                        </TableCell>
                                    </TableRow>
                                </Fragment>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>

                <Dialog open={addOpen} onClose={() => setAddOpen(false)}>
                    <DialogTitle>Dodaj uporabnika</DialogTitle>
                    <Box component="form" onSubmit={handleAddUser}>
                        <DialogContent sx={{ minWidth: 350 }}>
                            <TextField
                                label="Ime in priimek"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                fullWidth
                                required
                                margin="normal"
                            />
                            <TextField
                                label="Email"
                                type="email"
                                value={newEmail}
                                onChange={(e) => setNewEmail(e.target.value)}
                                fullWidth
                                required
                                margin="normal"
                            />
                            <TextField
                                select
                                label="Vloga"
                                value={newRole}
                                onChange={(e) => setNewRole(e.target.value as "user" | "admin")}
                                fullWidth
                                margin="normal"
                            >
                                <MenuItem value="user">Uporabnik</MenuItem>
                                <MenuItem value="admin">Administrator</MenuItem>
                            </TextField>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={() => setAddOpen(false)}>Prekliči</Button>
                            <Button type="submit" variant="contained">
                                Ustvari in pošlji email
                            </Button>
                        </DialogActions>
                    </Box>
                </Dialog>
            </Box>
        </>
    );
}