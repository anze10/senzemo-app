"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld("electronAPI", {
    listPrinters: () => electron_1.ipcRenderer.invoke("printers:list-local"),
    printZpl: (target, zpl) => electron_1.ipcRenderer.invoke("printers:print", target, zpl),
    // nov del - serial port picker
    onSerialPortRequest: (callback) => {
        electron_1.ipcRenderer.on("serial-port-list", (_event, ports) => callback(ports));
    },
    selectSerialPort: (portId) => {
        electron_1.ipcRenderer.send("serial-port-selected", portId);
    },
});
