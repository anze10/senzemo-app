"use client";

import {
  Avatar,
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


export default function Dashboard() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const cards = [
    {
      title: "Sestavi senzorje",
      icon: <Gauge size={22} />,
      href: "/parametrs",
      buttonText: "Začni sestavljanje",
      description: "Konfiguriraj in sestavi senzorje",
    },
    {
      title: "Zaloga",
      icon: <FileBox size={22} />,
      href: "/inventory",
      buttonText: "Preglej zalogo",
      description: "Upravljaj z zalogo in količinami",
    },
    // {
    //   title: "Naročila",
    //   icon: <FileBox size={22} />,
    //   href: "/orders",
    //   buttonText: "Preglej naročila",
    //   description: "Upravljaj naročila strank",
    // },
    {
      title: "Google Drive",
      icon: <Cloud size={22} />,
      href: "https://drive.google.com",
      buttonText: "Odpri Google Drive",
      description: "Dostop do spletne shranitvena",
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
            variant="outlined"
            sx={{
              height: "100%",
              display: "flex",
              flexDirection: "column",
              borderRadius: 3,
              transition: "all 0.2s ease-in-out",
              "&:hover": {
                transform: "translateY(-4px)",
                boxShadow: theme.shadows[6],
                borderColor: "primary.main",
              },
            }}
          >
            <CardHeader
              avatar={
                <Avatar
                  sx={{
                    bgcolor: "primary.main",
                    color: "primary.contrastText",
                    width: 40,
                    height: 40,
                  }}
                >
                  {card.icon}
                </Avatar>
              }
              title={card.title}
              slotProps={{
                title: {
                  variant: "h6",
                  fontWeight: 600,
                },
              }}
              sx={{ pb: 1 }}
            />
            <CardContent
              sx={{
                flexGrow: 1,
                pt: 0,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mb: 2, flexGrow: 1 }}
              >
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
                    fontWeight: 600,
                    borderRadius: 2,
                    textTransform: "none",
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