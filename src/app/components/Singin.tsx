"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Box, Button, Divider, TextField, Typography } from "@mui/material";
import { authClient } from "src/server/LOGIN_LUCIA_ACTION/auth-client";
import GoogleIcon from "@mui/icons-material/Google";

export default function Signin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const { error: signInError } = await authClient.signIn.email({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message ?? "Napačen email ali geslo.");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError("Prišlo je do napake pri prijavi.");
      console.error("Login error:", err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setError(null);
    await authClient.signIn.social({
      provider: "google",
      callbackURL: "/dashboard",
    });
  }

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: 400,
        margin: "auto",
        padding: 4,
        backgroundColor: "#1f2937",
        borderRadius: 2,
        boxShadow: 3,
      }}
    >
      <Typography
        variant="h4"
        sx={{
          textAlign: "center",
          fontWeight: "bold",
          color: "#ffffff",
          marginBottom: 3,
        }}
      >
        Prijava v SENZEMO
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box component="form" onSubmit={handleEmailLogin}>
        <TextField
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          fullWidth
          required
          margin="normal"
          autoComplete="email"
          slotProps={{
            inputLabel: { sx: { color: "#9ca3af" } },
          }}
          sx={{
            input: { color: "#e5e7eb" },
            "& .MuiOutlinedInput-notchedOutline": { borderColor: "#4b5563" },
          }}
        />
        <TextField
          label="Geslo"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          fullWidth
          required
          margin="normal"
          autoComplete="current-password"
          slotProps={{
            inputLabel: { sx: { color: "#9ca3af" } },
          }}
          sx={{
            input: { color: "#e5e7eb" },
            "& .MuiOutlinedInput-notchedOutline": { borderColor: "#4b5563" },
          }}
        />
        <Button
          type="submit"
          fullWidth
          variant="contained"
          disabled={isLoading}
          sx={{ mt: 2 }}
        >
          {isLoading ? "Prijavljam..." : "Prijava"}
        </Button>
      </Box>

      <Divider sx={{ my: 3, borderColor: "#4b5563", color: "#9ca3af" }}>
        ali
      </Divider>

      <Button
        onClick={handleGoogleLogin}
        fullWidth
        variant="outlined"
        startIcon={<GoogleIcon />}
        sx={{
          color: "#e5e7eb",
          backgroundColor: "#374151",
          borderColor: "#9ca3af",
          "&:hover": {
            backgroundColor: "#4b5563",
          },
        }}
      >
        Prijava z Google računom
      </Button>
    </Box>
  );
}