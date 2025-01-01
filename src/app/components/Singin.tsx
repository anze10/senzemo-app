"use client";

//import { useState } from 'react'
//import { useRouter } from 'next/navigation'
import React from "react";
import { getGoogleOauthConsentUrl } from "src/server/auth.action";
import { toast } from "sonner";
import { Box, Typography, TextField, Button } from "@mui/material";
import { signIn } from "src/server/auth_due.actions";

import { useForm, Controller } from "react-hook-form";

import { zodResolver } from "@hookform/resolvers/zod";
import GoogleIcon from "@mui/icons-material/Google";
import { signInSchema } from "~/validators/auth_due";

export default function Signin() {
  const { handleSubmit, control } = useForm({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: { email: string; password: string }) => {
    console.log("Submitted values:", values);
    try {
      const response: { success: boolean; error?: string } = await signIn(
        values
      );
      console.log("SignIn response:", response);
      if (response.success) {
        toast.success("Prijava uspešna!");
      } else {
        toast.error(response.error || "Napaka pri prijavi.");
      }
    } catch (error) {
      console.error("Error during sign-in:", error);
      toast.error(
        (error as Error).message || "Prišlo je do nepričakovane napake."
      );
    }
  };

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
          marginBottom: 2,
        }}
      >
        Prijava v SENZEMO
      </Typography>
      <form
        onSubmit={handleSubmit(onSubmit)}
        style={{ marginBottom: "1.5rem" }}
      >
        <Controller
          name="email"
          control={control}
          render={({ field, fieldState }) => (
            <TextField
              label="E-poštni naslov"
              type="email"
              fullWidth
              variant="outlined"
              {...field}
              error={!!fieldState.error}
              helperText={fieldState.error?.message}
              sx={{
                marginBottom: 2,
                "& .MuiInputBase-root": {
                  backgroundColor: "#374151",
                  color: "#ffffff",
                },
                "& .MuiFormLabel-root": { color: "#9ca3af" },
              }}
            />
          )}
        />
        <Controller
          name="password"
          control={control}
          render={({ field, fieldState }) => (
            <TextField
              label="Geslo"
              type="password"
              fullWidth
              variant="outlined"
              {...field}
              error={!!fieldState.error}
              helperText={fieldState.error?.message}
              sx={{
                marginBottom: 2,
                "& .MuiInputBase-root": {
                  backgroundColor: "#374151",
                  color: "#ffffff",
                },
                "& .MuiFormLabel-root": { color: "#9ca3af" },
              }}
            />
          )}
        />
        <Button
          type="submit"
          fullWidth
          variant="contained"
          sx={{
            backgroundColor: "#2563eb",
            "&:hover": { backgroundColor: "#1e40af" },
            padding: "10px 0",
          }}
        >
          Prijava
        </Button>
      </form>
      <Button
        onClick={async () => {
          const res = await getGoogleOauthConsentUrl();
          if (res.url) {
            window.location.href = res.url;
          } else {
            toast.error(JSON.stringify(res.error));
          }
        }}
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
