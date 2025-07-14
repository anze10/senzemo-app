"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import CpuIcon from "@mui/icons-material/Memory";
import InventoryIcon from "@mui/icons-material/Inventory";
import SalesIcon from "@mui/icons-material/BarChart";
import OrdersIcon from "@mui/icons-material/ShoppingCart";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Paper from "@mui/material/Paper";

const navItems = [
  { name: "Sensors", href: "/", icon: <CpuIcon /> },
  { name: "Inventory", href: "/inventory", icon: <InventoryIcon /> },
  { name: "Sales", href: "/sales", icon: <SalesIcon /> },
  { name: "Orders", href: "/orders", icon: <OrdersIcon /> },
];

export function Navbar() {
  const pathname = usePathname();
  const [isHovered, setIsHovered] = useState<string | null>(null);

  return (
    <Paper
      elevation={3}
      className="w-64 bg-linear-to-b from-blue-600 to-purple-600 p-4 text-white"
    >
      <div className="mb-8 text-2xl font-bold">Inventory System</div>
      <List>
        {navItems.map((item) => (
          <ListItem key={item.name} disablePadding>
            <Link href={item.href} passHref>
              <ListItemButton
                component="a"
                selected={pathname === item.href}
                onMouseEnter={() => setIsHovered(item.name)}
                onMouseLeave={() => setIsHovered(null)}
                sx={{
                  borderRadius: "8px",
                  "&.Mui-selected": {
                    bgcolor: "rgba(255, 255, 255, 0.2)",
                  },
                  "&:hover": {
                    transform: "scale(1.05)",
                    transition: "transform 0.2s",
                  },
                  "&:active": {
                    transform: "scale(0.95)",
                  },
                }}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.name} />
                {isHovered === item.name && (
                  <motion.div
                    className="absolute left-0 h-full w-1 rounded-r-full bg-white"
                    layoutId="navbar-highlight"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  />
                )}
              </ListItemButton>
            </Link>
          </ListItem>
        ))}
      </List>
    </Paper>
  );
}
