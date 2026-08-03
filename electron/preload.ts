import { contextBridge, ipcRenderer } from "electron";
import type { Tiskalnik } from "./printer/printer_server_side";

contextBridge.exposeInMainWorld("electronAPI", {
  listPrinters: () => ipcRenderer.invoke("printers:list-local"),
  printZpl: (target: Tiskalnik, zpl: string) =>
    ipcRenderer.invoke("printers:print", target, zpl),

  // nov del - serial port picker
  onSerialPortRequest: (callback: (ports: unknown[]) => void) => {
    ipcRenderer.on("serial-port-list", (_event, ports) => callback(ports));
  },
  selectSerialPort: (portId: string) => {
    ipcRenderer.send("serial-port-selected", portId);
  },
});
