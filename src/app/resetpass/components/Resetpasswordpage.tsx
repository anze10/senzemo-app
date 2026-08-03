"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { resetPassword } from "src/server/LOGIN_LUCIA_ACTION/auth-client";
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    TextField,
    Typography,
} from "@mui/material";

export default function ResetPasswordPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get("token");
    const errorParam = searchParams.get("error");

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    if (errorParam === "INVALID_TOKEN") {
        return (
            <Card sx={{ maxWidth: 400, mx: "auto", mt: 8 }}>
                <CardContent>
                    <Alert severity="error">
                        Povezava za nastavitev gesla je potekla ali neveljavna. Prosi
                        administratorja za novo povezavo.
                    </Alert>
                </CardContent>
            </Card>
        );
    }

    if (!token) {
        return (
            <Card sx={{ maxWidth: 400, mx: "auto", mt: 8 }}>
                <CardContent>
                    <Alert severity="error">Manjka token za nastavitev gesla.</Alert>
                </CardContent>
            </Card>
        );
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);

        if (password !== confirmPassword) {
            setError("Gesli se ne ujemata.");
            return;
        }
        if (password.length < 8) {
            setError("Geslo mora imeti vsaj 8 znakov.");
            return;
        }

        setIsLoading(true);
        try {
            const { error: resetError } = await resetPassword({
                newPassword: password,
                token: token!,
            });

            if (resetError) {
                setError(resetError.message ?? "Napaka pri nastavitvi gesla.");
                return;
            }

            setSuccess(true);
            setTimeout(() => router.push("/"), 2000);
        } catch (err) {
            setError("Prišlo je do napake.");
            console.error("Reset password error:", err);
        } finally {
            setIsLoading(false);
        }
    }

    if (success) {
        return (
            <Card sx={{ maxWidth: 400, mx: "auto", mt: 8 }}>
                <CardContent>
                    <Alert severity="success">
                        Geslo uspešno nastavljeno. Preusmerjam na prijavo...
                    </Alert>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card sx={{ maxWidth: 400, mx: "auto", mt: 8 }}>
            <CardContent>
                <Typography variant="h5" gutterBottom align="center">
                    Nastavi geslo
                </Typography>

                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}

                <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
                    <TextField
                        label="Novo geslo"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        fullWidth
                        required
                        margin="normal"
                        autoComplete="new-password"
                    />
                    <TextField
                        label="Potrdi geslo"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        fullWidth
                        required
                        margin="normal"
                        autoComplete="new-password"
                    />
                    <Button
                        type="submit"
                        variant="contained"
                        fullWidth
                        disabled={isLoading}
                        sx={{ mt: 2 }}
                    >
                        {isLoading ? "Nastavljam..." : "Nastavi geslo"}
                    </Button>
                </Box>
            </CardContent>
        </Card>
    );
}