"use client";

import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Container,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { Cloud, FileBox, Gauge } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Dashboard",
  description: "Pregled in upravljanje vaše aplikacije",
};

export default function Dashboard() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const cards = [
    {
      title: "Sestavi senzorje",
      icon: <Gauge size={20} />,
      href: "/parametrs",
      buttonText: "Začni sestavljanje",
      description: "Configure and build sensors",
    },
    {
      title: "Zaloga",
      icon: <FileBox size={20} />,
      href: "/inventory",
      buttonText: "Preglej zalogo",
      description: "Manage inventory and stock",
    },
    {
      title: "Google Drive",
      icon: <Cloud size={20} />,
      href: "https://drive.google.com",
      buttonText: "Odpri Google Drive",
      description: "Access cloud storage",
      external: true,
    },
  ];

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 2, md: 4 } }}>
      <Box sx={{ mb: { xs: 3, md: 4 } }}>
        <Typography
          variant={isMobile ? "h4" : "h3"}
          component="h1"
          sx={{
            fontWeight: 700,
            color: "primary.main",
            mb: 1,
            textAlign: { xs: "center", md: "left" },
          }}
        >
          Dobrodošli na nadzorni plošči
        </Typography>
        <Typography
          variant="body1"
          color="text.secondary"
          sx={{ textAlign: { xs: "center", md: "left" } }}
        >
          Pregled in upravljanje vaše aplikacije
        </Typography>
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, 1fr)",
            md: "repeat(3, 1fr)",
          },
          gap: { xs: 2, md: 3 },
        }}
      >
        {cards.map((card) => (
          <Card
            key={card.title}
            sx={{
              height: "100%",
              display: "flex",
              flexDirection: "column",
              transition: "all 0.2s ease-in-out",
              "&:hover": {
                transform: "translateY(-4px)",
                boxShadow: theme.shadows[8],
              },
            }}
          >
            <CardHeader
              title={card.title}
              action={card.icon}
              titleTypographyProps={{
                variant: "h6",
                fontWeight: 600,
                color: "primary.main",
              }}
              sx={{
                pb: 1,
                "& .MuiCardHeader-action": {
                  color: "primary.main",
                },
              }}
            />
            <CardContent sx={{ flexGrow: 1, pt: 0 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {card.description}
              </Typography>
              <Link
                href={card.href}
                passHref
                {...(card.external && {
                  target: "_blank",
                  rel: "noopener noreferrer",
                })}
              >
                <Button
                  fullWidth
                  variant="contained"
                  size={isMobile ? "large" : "medium"}
                  sx={{
                    mt: "auto",
                    fontWeight: 600,
                  }}
                >
                  {card.buttonText}
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </Box>
    </Container>
  );
}
