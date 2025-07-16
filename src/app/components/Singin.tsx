"use client";

//import { useState } from 'react'
//import { useRouter } from 'next/navigation'
import React from "react";
// import { getGoogleOauthConsentUrl } from "src/server/auth.action";
// import { toast } from "sonner";
import { Box, Button, Typography } from "@mui/material";
//import { signIn } from "src/server/auth_due.actions";

import GoogleIcon from "@mui/icons-material/Google";

// import { getBaseUrl } from "~/lib/getBaseUrl";
// import { useRouter } from 'next/navigation'

export default function Signin() {
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

      <Button
        onClick={() => {
          window.location.href = "/login/google";
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
