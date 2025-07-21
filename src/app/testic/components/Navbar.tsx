"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import CpuIcon from "@mui/icons-material/Memory";
import InventoryIcon from "@mui/icons-material/Inventory";
import SalesIcon from "@mui/icons-material/BarChart";
import OrdersIcon from "@mui/icons-material/ShoppingCart";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Paper from "@mui/material/Paper";
import {
  Box,
  Drawer,
  IconButton,
  useMediaQuery,
  useTheme,
} from "@mui/material";

const navItems = [
  { name: "Sensors", href: "/", icon: <CpuIcon /> },
  { name: "Inventory", href: "/inventory", icon: <InventoryIcon /> },
  { name: "Sales", href: "/sales", icon: <SalesIcon /> },
  { name: "Orders", href: "/orders", icon: <OrdersIcon /> },
];

export function Navbar() {
  const pathname = usePathname();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const NavContent = () => (
    <Box sx={{ p: 2 }}>
      <Box
        sx={{
          mb: 4,
          fontSize: { xs: "1.25rem", md: "1.5rem" },
          fontWeight: "bold",
          color: "primary.main",
          textAlign: { xs: "center", md: "left" },
        }}
      >
        Inventory System
      </Box>
      <List>
        {navItems.map((item) => (
          <ListItem key={item.name} disablePadding>
            <Link
              href={item.href}
              passHref
              style={{ width: "100%", textDecoration: "none" }}
            >
              <ListItemButton
                component="div"
                selected={pathname === item.href}
                onClick={() => isMobile && setMobileOpen(false)}
                sx={{
                  borderRadius: 2,
                  mb: 1,
                  "&.Mui-selected": {
                    bgcolor: "primary.main",
                    color: "primary.contrastText",
                    "& .MuiListItemIcon-root": {
                      color: "primary.contrastText",
                    },
                  },
                  "&:hover": {
                    bgcolor: "primary.light",
                    color: "primary.contrastText",
                    transform: "scale(1.02)",
                    transition: "all 0.2s ease-in-out",
                    "& .MuiListItemIcon-root": {
                      color: "primary.contrastText",
                    },
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    color: pathname === item.href ? "inherit" : "primary.main",
                    minWidth: 40,
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.name}
                  primaryTypographyProps={{
                    fontSize: { xs: "0.875rem", md: "1rem" },
                    fontWeight: pathname === item.href ? 600 : 500,
                  }}
                />
              </ListItemButton>
            </Link>
          </ListItem>
        ))}
      </List>
    </Box>
  );

  if (isMobile) {
    return (
      <>
        <IconButton
          color="inherit"
          aria-label="open drawer"
          edge="start"
          onClick={handleDrawerToggle}
          sx={{
            position: "fixed",
            top: 16,
            left: 16,
            zIndex: 1300,
            bgcolor: "primary.main",
            color: "white",
            "&:hover": {
              bgcolor: "primary.dark",
            },
          }}
        >
          <MenuIcon />
        </IconButton>

        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
          sx={{
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: 280,
            },
          }}
        >
          <Box sx={{ display: "flex", justifyContent: "flex-end", p: 1 }}>
            <IconButton onClick={handleDrawerToggle}>
              <CloseIcon />
            </IconButton>
          </Box>
          <NavContent />
        </Drawer>
      </>
    );
  }

  return (
    <Paper
      elevation={3}
      sx={{
        width: 280,
        height: "fit-content",
        bgcolor: "background.paper",
        borderRadius: 2,
      }}
    >
      <NavContent />
    </Paper>
  );
}
