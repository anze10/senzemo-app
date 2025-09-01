"use client"

import { useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import {
    AppBar,
    Avatar,
    Box,
    Button,
    Container,
    Divider,
    Drawer,
    IconButton,
    List,
    ListItem,
    ListItemButton,
    ListItemText,
    Stack,
    Toolbar,
    Typography,
    useMediaQuery,
    useTheme
} from "@mui/material"
import { Close as CloseIcon, Logout, Menu as MenuIcon } from "@mui/icons-material"
import { logOut } from "~/server/LOGIN_LUCIA_ACTION/auth.action"

const tabs = [
    { id: "home", label: "Home", path: "/dashboard" },
    { id: "orders", label: "Orders", path: "/orders" },
    { id: "inventory", label: "Inventory", path: "/inventory" },
    { id: "do order", label: "Do Order", path: "/parameters" },
]

export default function Navbar() {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
    const router = useRouter()
    const pathname = usePathname()
    const theme = useTheme()
    const isMobile = useMediaQuery(theme.breakpoints.down('md'))

    // Determine active tab based on current pathname
    const getActiveTab = () => {
        const currentTab = tabs.find(tab => tab.path === pathname)
        return currentTab ? currentTab.id : "home"
    }

    const activeTab = getActiveTab()

    const handleLogout = () => {
        logOut()
        router.push("/")
    }

    const handleTabClick = (tab: { id: string; label: string; path: string }) => {
        router.push(tab.path)
        if (isMobile) {
            setIsMobileMenuOpen(false)
        }
    }

    return (
        <AppBar position="static" color="default" elevation={1}>
            <Container maxWidth="xl">
                <Toolbar sx={{ justifyContent: 'space-between', height: 64 }}>
                    {/* Logo/Brand and Navigation combined on left */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Typography variant="h6" component="h1" sx={{ fontWeight: 600 }}>
                            MyApp
                        </Typography>

                        {/* Desktop Navigation */}
                        <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 1 }}>
                            {tabs.map((tab) => (
                                <Button
                                    key={tab.id}
                                    onClick={() => handleTabClick(tab)}
                                    variant={activeTab === tab.id ? "contained" : "text"}
                                    size="small"
                                    sx={{
                                        minWidth: 'auto',
                                        px: 2,
                                        py: 1,
                                        borderRadius: 2,
                                        textTransform: 'none',
                                        fontWeight: 500
                                    }}
                                >
                                    {tab.label}
                                </Button>
                            ))}
                        </Box>
                    </Box>

                    {/* Desktop Profile Picture with Logout */}
                    <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 2 }}>
                        <Avatar
                            src="/professional-profile-avatar.png"
                            alt="Profile"
                            sx={{
                                width: 32,
                                height: 32,
                                background: 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)'
                            }}
                        />
                        <Button
                            variant="outlined"
                            size="small"
                            onClick={handleLogout}
                            startIcon={<Logout />}
                            sx={{
                                textTransform: 'none',
                                borderRadius: 2
                            }}
                        >
                            Logout
                        </Button>
                    </Box>

                    {/* Mobile menu button */}
                    <Box sx={{ display: { xs: 'block', md: 'none' } }}>
                        <IconButton
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            edge="end"
                            color="inherit"
                            aria-label="menu"
                        >
                            {isMobileMenuOpen ? <CloseIcon /> : <MenuIcon />}
                        </IconButton>
                    </Box>
                </Toolbar>
            </Container>

            {/* Mobile Navigation Drawer */}
            <Drawer
                anchor="right"
                open={isMobileMenuOpen}
                onClose={() => setIsMobileMenuOpen(false)}
                sx={{ display: { xs: 'block', md: 'none' } }}
            >
                <Box sx={{ width: 250, p: 2 }}>
                    <List>
                        {tabs.map((tab) => (
                            <ListItem key={tab.id} disablePadding>
                                <ListItemButton
                                    onClick={() => handleTabClick(tab)}
                                    selected={activeTab === tab.id}
                                    sx={{
                                        borderRadius: 1,
                                        mb: 0.5
                                    }}
                                >
                                    <ListItemText
                                        primary={tab.label}
                                        primaryTypographyProps={{
                                            fontWeight: activeTab === tab.id ? 600 : 400
                                        }}
                                    />
                                </ListItemButton>
                            </ListItem>
                        ))}
                    </List>

                    <Divider sx={{ my: 2 }} />

                    <Stack spacing={2} alignItems="center">
                        <Stack direction="row" spacing={2} alignItems="center">
                            <Avatar
                                src="/professional-profile-avatar.png"
                                alt="Profile"
                                sx={{
                                    width: 32,
                                    height: 32,
                                    background: 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)'
                                }}
                            />
                            <Typography variant="body2" color="text.secondary">
                                Your Profile
                            </Typography>
                        </Stack>

                        <Button
                            variant="outlined"
                            size="small"
                            onClick={handleLogout}
                            startIcon={<Logout />}
                            fullWidth
                            sx={{
                                textTransform: 'none',
                                borderRadius: 2
                            }}
                        >
                            Logout
                        </Button>
                    </Stack>
                </Box>
            </Drawer>
        </AppBar>
    )
}