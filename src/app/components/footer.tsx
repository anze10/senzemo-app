
import { Box, Container, Typography } from "@mui/material";

export function Footer() {
    return (
        <Box
            component="footer"
            sx={{
                width: "100%",
                borderTop: "1px solid",
                borderColor: "#1e293b",
                bgcolor: "#0f172a",
                color: "#cbd5e1",
            }}
        >
            <Container maxWidth="lg" sx={{ py: 5 }}>

                <Typography
                    variant="caption"
                    sx={{ display: "block", textAlign: "center", color: "#64748b" }}
                >
                    © {new Date().getFullYear()} Senzemo. Vse pravice pridržane.
                </Typography>
            </Container>
        </Box>
    );
}