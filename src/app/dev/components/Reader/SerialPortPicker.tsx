"use client";
import { useEffect, useState } from "react";
import {
    Dialog,
    DialogTitle,
    List,
    ListItemButton,
    ListItemText,
} from "@mui/material";

interface SerialPortInfo {
    portId: string;
    portName?: string;
    displayName?: string;
    vendorId?: string;
    productId?: string;
}

export function SerialPortPicker() {
    const [ports, setPorts] = useState<SerialPortInfo[] | null>(null);

    useEffect(() => {
        if (typeof window === "undefined" || !window.electronAPI) return;

        const handleSerialPortRequest = (portList: unknown[]) => {
            setPorts(portList as SerialPortInfo[]);
        };

        window.electronAPI.onSerialPortRequest(handleSerialPortRequest);
    }, []);

    function handleSelect(portId: string) {
        window.electronAPI?.selectSerialPort(portId);
        setPorts(null);
    }

    if (!ports) return null;

    const usbPorts = ports.filter((p) => p.vendorId !== undefined);

    return (
        <Dialog open onClose={() => handleSelect("")}>
            <DialogTitle>Izberi napravo za povezavo</DialogTitle>
            <List sx={{ minWidth: 320 }}>
                {usbPorts.length === 0 && (
                    <ListItemText sx={{ px: 2, py: 1 }} primary="Ni zaznanih USB naprav" />
                )}
                {usbPorts.map((p) => (
                    <ListItemButton key={p.portId} onClick={() => handleSelect(p.portId)}>
                        <ListItemText
                            primary={p.displayName ?? p.portName ?? p.portId}
                            secondary={
                                p.vendorId ? `Vendor: ${p.vendorId}, Product: ${p.productId}` : undefined
                            }
                        />
                    </ListItemButton>
                ))}
            </List>
        </Dialog>
    );
}