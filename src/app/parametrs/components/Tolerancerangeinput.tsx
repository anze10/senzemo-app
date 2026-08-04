"use client";

import { Box, TextField, Typography } from "@mui/material";

interface ToleranceRangeInputProps {
    label: string;
    from: number;
    upTo: number;
    onChange: (from: number, upTo: number) => void;
}

export function ToleranceRangeInput({
    label,
    from,
    upTo,
    onChange,
}: ToleranceRangeInputProps) {
    return (
        <Box>
            <Typography variant="body2" sx={{ mb: 0.5, color: "text.secondary" }}>
                {label} — dovoljen razpon
            </Typography>
            <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                <TextField
                    label="Od"
                    type="number"
                    size="small"
                    value={from}
                    onChange={(e) => onChange(Number(e.target.value), upTo)}
                    sx={{ flex: 1 }}
                />
                <Typography color="text.secondary">–</Typography>
                <TextField
                    label="Do"
                    type="number"
                    size="small"
                    value={upTo}
                    onChange={(e) => onChange(from, Number(e.target.value))}
                    sx={{ flex: 1 }}
                />
            </Box>
        </Box>
    );
}