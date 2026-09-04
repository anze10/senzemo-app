"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Box, Button, TextField, Typography } from "@mui/material";
import { authClient } from "src/server/LOGIN_LUCIA_ACTION/auth-client";


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
        rememberMe: false,
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
        Prijava v SENZEMO production tool
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

    </Box>
  );
}