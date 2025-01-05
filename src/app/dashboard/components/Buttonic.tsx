"use client"
import { Typography, Card, CardHeader, CardContent, Button, Box } from '@mui/material';
import { Gauge, Package, FileBox, Cloud } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
    title: "Dashboard",
    description: "Pregled in upravljanje vaše aplikacije",
};

export function Dashboard() {
    return (
        <Box sx={{ p: 5 }}>
            <Typography variant="h3" component="h1" sx={{ mb: 5, fontWeight: 'bold' }}>
                Dobrodošli na nadzorni plošči
            </Typography>
            <Box display="flex" flexWrap="wrap" gap={2}>
                <Box flex="1 1 100%" maxWidth="100%" sx={{ maxWidth: { xs: '100%', sm: '50%', md: '25%' } }}>
                    <Card>
                        <CardHeader
                            title="Sestavi senzorje"
                            action={<Gauge size={16} />}
                            titleTypographyProps={{ variant: 'subtitle1' }}
                            sx={{ pb: 2 }}
                        />
                        <CardContent>
                            <Link href="/sestavi-senzorje" passHref>
                                <Button fullWidth variant="contained">
                                    Začni sestavljanje
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                </Box>
                <Box flex="1 1 100%" maxWidth="100%" sx={{ maxWidth: { xs: '100%', sm: '50%', md: '25%' } }}>
                    <Card>
                        <CardHeader
                            title="Preglej naročila"
                            action={<Package size={16} />}
                            titleTypographyProps={{ variant: 'subtitle1' }}
                            sx={{ pb: 2 }}
                        />
                        <CardContent>
                            <Link href="/narocila" passHref>
                                <Button fullWidth variant="contained">
                                    Odpri naročila
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                </Box>
                <Box flex="1 1 100%" maxWidth="100%" sx={{ maxWidth: { xs: '100%', sm: '50%', md: '25%' } }}>
                    <Card>
                        <CardHeader
                            title="Inventar"
                            action={<FileBox size={16} />}
                            titleTypographyProps={{ variant: 'subtitle1' }}
                            sx={{ pb: 2 }}
                        />
                        <CardContent>
                            <Link href="/inventar" passHref>
                                <Button fullWidth variant="contained">
                                    Preglej inventar
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                </Box>
                <Box flex="1 1 100%" maxWidth="100%" sx={{ maxWidth: { xs: '100%', sm: '50%', md: '25%' } }}>
                    <Card>
                        <CardHeader
                            title="OneDrive"
                            action={<Cloud size={16} />}
                            titleTypographyProps={{ variant: 'subtitle1' }}
                            sx={{ pb: 2 }}
                        />
                        <CardContent>
                            <Link href="https://onedrive.live.com" passHref>
                                <Button fullWidth variant="contained">
                                    Odpri OneDrive
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                </Box>
            </Box>
        </Box>
    );
}
