"use client";

import {
  Typography,
  Card,
  CardHeader,
  CardContent,
  Button,
  Box,
} from "@mui/material";
import { Gauge, Cloud, FileBox } from "lucide-react";
//import { Package, FileBox } from 'lucide-react';
import Link from "next/link";

export const metadata = {
  title: "Dashboard",
  description: "Pregled in upravljanje vaše aplikacije",
};

export default function Dashboard() {
  return (
    <Box sx={{ p: 5 }}>
      <Typography
        variant="h3"
        component="h1"
        sx={{ mb: 5, fontWeight: "bold" }}
      >
        Dobrodošli na nadzorni plošči
      </Typography>
      <Box display="flex" flexWrap="wrap" gap={2}>
        <Box
          flex="1 1 100%"
          maxWidth="100%"
          sx={{ maxWidth: { xs: "100%", sm: "50%", md: "25%" } }}
        >
          <Card>
            <CardHeader
              title="Sestavi senzorje"
              action={<Gauge size={16} />}
              titleTypographyProps={{ variant: "subtitle1" }}
              sx={{ pb: 2 }}
            />
            <CardContent>
              <Link href="/parametrs" passHref>
                <Button fullWidth variant="contained">
                  Začni sestavljanje
                </Button>
              </Link>
            </CardContent>
          </Card>
        </Box>
        {/* <Box flex="1 1 100%" maxWidth="100%" sx={{ maxWidth: { xs: '100%', sm: '50%', md: '25%' } }}>
                    <Card>
                        <CardHeader
                            title="Preglej naročila"
                            action={<Package size={16} />}
                            titleTypographyProps={{ variant: 'subtitle1' }}
                            sx={{ pb: 2 }}
                        />
                        <CardContent>
                            <Link href="/orders" passHref>
                                <Button fullWidth variant="contained">
                                    Odpri naročila
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                </Box>*/}
        <Box
          flex="1 1 100%"
          maxWidth="100%"
          sx={{ maxWidth: { xs: "100%", sm: "50%", md: "25%" } }}
        >
          <Card>
            <CardHeader
              title="zaloga"
              action={<FileBox size={16} />}
              titleTypographyProps={{ variant: "subtitle1" }}
              sx={{ pb: 2 }}
            />
            <CardContent>
              <Link href="/inventory" passHref>
                <Button fullWidth variant="contained">
                  Preglej zalogo
                </Button>
              </Link>
            </CardContent>
          </Card>
        </Box>
        <Box
          flex="1 1 100%"
          maxWidth="100%"
          sx={{ maxWidth: { xs: "100%", sm: "50%", md: "25%" } }}
        >
          <Card>
            <CardHeader
              title="Google Drive"
              action={<Cloud size={16} />}
              titleTypographyProps={{ variant: "subtitle1" }}
              sx={{ pb: 2 }}
            />
            <CardContent>
              <Link href="https://drive.google.com" passHref>
                <Button fullWidth variant="contained">
                  Odpri Google Drive
                </Button>
              </Link>
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Box>
  );
}
