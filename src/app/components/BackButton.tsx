"use client";

import { useRouter } from "next/navigation";
import { Button } from "@mui/material";
import { ArrowLeft } from "lucide-react";

interface BackButtonProps {
    label?: string;
    fallbackHref?: string;
}

export function BackButton({ label = "Nazaj", fallbackHref = "/dashboard" }: BackButtonProps) {
    const router = useRouter();

    function handleBack() {
        // Electron nima brskalniške "nazaj" tipke - router.back() uporabi
        // Next-ov client-side history sklad, kar je najbližji ekvivalent.
        // Če zgodovina ni na voljo (npr. direkten vstop na stran), pojdi
        // na varen privzet cilj namesto da obtičiš.
        if (window.history.length > 1) {
            router.back();
        } else {
            router.push(fallbackHref);
        }
    }

    return (
        <Button
            onClick={handleBack}
            startIcon={<ArrowLeft size={18} />}
            variant="text"
            size="small"
            sx={{
                mb: 2,
                color: "text.secondary",
                "&:hover": { backgroundColor: "action.hover" },
            }}
        >
            {label}
        </Button>
    );
}