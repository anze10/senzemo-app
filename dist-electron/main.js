"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const fs_1 = require("fs");
const net_1 = __importDefault(require("net"));
const child_process_1 = require("child_process");
const printer_server_side_1 = require("./printer/printer_server_side");
// --- Prepreči večkratni zagon app-a (rešuje "milijon belih oken") ---
const gotSingleInstanceLock = electron_1.app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
    electron_1.app.quit();
    process.exit(0);
}
let pendingPortCallback = null;
let mainWindow = null;
let nextProcess = null;
const isDev = !electron_1.app.isPackaged;
electron_1.app.on("second-instance", () => {
    if (mainWindow) {
        if (mainWindow.isMinimized())
            mainWindow.restore();
        mainWindow.focus();
    }
});
// --- IPC handlerji za tiskalnike ---
electron_1.ipcMain.handle("printers:list-local", async () => (0, printer_server_side_1.getLocalPrinters)());
electron_1.ipcMain.handle("printers:print", async (_event, target, zpl) => (0, printer_server_side_1.printZpl)(target, zpl));
// renderer pošlje nazaj izbran serial port
electron_1.ipcMain.on("serial-port-selected", (_event, portId) => {
    if (pendingPortCallback) {
        pendingPortCallback(portId);
        pendingPortCallback = null;
    }
});
function createWindow() {
    mainWindow = new electron_1.BrowserWindow({
        width: 1280,
        height: 850,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path_1.default.join(__dirname, "preload.js"),
        },
    });
    mainWindow.loadURL("http://localhost:3000");
    if (isDev) {
        mainWindow.webContents.openDevTools();
    }
    mainWindow.on("closed", () => {
        mainWindow = null;
    });
}
// TCP-level preverjanje namesto fetch() - neodvisno od Chromium network service
function waitForPortOpen(port, host = "127.0.0.1", maxAttempts = 40) {
    return new Promise((resolve, reject) => {
        let attempts = 0;
        const tryConnect = () => {
            attempts++;
            console.log(`[main] Preverjam port ${port}, poskus ${attempts}/${maxAttempts}...`);
            const socket = new net_1.default.Socket();
            socket.once("connect", () => {
                console.log(`[main] Port ${port} je odprt, server je pripravljen.`);
                socket.destroy();
                resolve();
            });
            socket.once("error", () => {
                socket.destroy();
                if (attempts >= maxAttempts) {
                    reject(new Error(`Next.js server ni odprl porta ${port} po ${maxAttempts} poskusih.`));
                    return;
                }
                setTimeout(tryConnect, 500);
            });
            socket.connect(port, host);
        };
        tryConnect();
    });
}
async function startNextServer() {
    if (isDev)
        return; // dev server že teče preko "bun run dev"
    const appPath = path_1.default.join(process.resourcesPath, "app");
    const nextBin = path_1.default.join(appPath, "node_modules", "next", "dist", "bin", "next");
    const logPath = path_1.default.join(electron_1.app.getPath("userData"), "next.log");
    (0, fs_1.writeFileSync)(logPath, `--- Nov zagon ${new Date().toISOString()} ---\n`);
    console.log(`[main] appPath: ${appPath}`);
    console.log(`[main] nextBin: ${nextBin}`);
    console.log(`[main] nextBin obstaja: ${(0, fs_1.existsSync)(nextBin)}`);
    console.log(`[main] Next izpis se piše v: ${logPath}`);
    if (!(0, fs_1.existsSync)(nextBin)) {
        throw new Error(`Next.js binary ne obstaja na poti: ${nextBin}. Preveri build konfiguracijo (asar/files).`);
    }
    nextProcess = (0, child_process_1.spawn)(process.execPath, [nextBin, "start"], {
        cwd: appPath,
        env: {
            ...process.env,
            PORT: "3000",
            // KLJUČNO: process.execPath je Electron binary, ne navaden Node.
            // Brez te zastavice Electron poskuša nextBin naložiti kot svojo
            // GUI app (ne kot Node script), zato se tiho konča z code 0
            // brez da bi kadarkoli dejansko pognal Next.js kodo.
            ELECTRON_RUN_AS_NODE: "1",
        },
        // BREZ shell: true - direktno preko Node executable-a,
        // izogne se "spawn /bin/sh ENOENT" napaki v AppImage okolju
    });
    console.log(`[main] next proces spawnan, pid: ${nextProcess.pid}`);
    nextProcess.on("error", (err) => {
        console.error("[main] Napaka pri spawnanju next procesa:", err);
        (0, fs_1.appendFileSync)(logPath, `[ERROR spawn] ${err.message}\n`);
    });
    nextProcess.on("exit", (code, signal) => {
        console.log(`[main] next proces končan, code: ${code}, signal: ${signal}`);
        (0, fs_1.appendFileSync)(logPath, `[EXIT] code=${code} signal=${signal}\n`);
    });
    nextProcess.stdout?.on("data", (d) => {
        const text = d.toString();
        console.log(`[next] ${text}`);
        (0, fs_1.appendFileSync)(logPath, text);
    });
    nextProcess.stderr?.on("data", (d) => {
        const text = d.toString();
        console.error(`[next] ${text}`);
        (0, fs_1.appendFileSync)(logPath, text);
    });
    console.log("[main] Čakam da next server odpre port 3000...");
    await waitForPortOpen(3000);
    console.log("[main] Next server pripravljen.");
}
electron_1.app.whenReady().then(async () => {
    electron_1.session.defaultSession.on("select-serial-port", (event, portList, webContents, callback) => {
        event.preventDefault();
        pendingPortCallback = callback;
        webContents.send("serial-port-list", portList);
    });
    electron_1.session.defaultSession.setPermissionCheckHandler((webContents, permission) => {
        return permission === "serial";
    });
    electron_1.session.defaultSession.setDevicePermissionHandler((details) => {
        return details.deviceType === "serial";
    });
    try {
        await startNextServer();
    }
    catch (err) {
        console.error("[main] KRITIČNA NAPAKA pri zagonu Next serverja:", err);
    }
    createWindow();
});
electron_1.app.on("window-all-closed", () => {
    if (process.platform !== "darwin")
        electron_1.app.quit();
});
electron_1.app.on("activate", () => {
    if (electron_1.BrowserWindow.getAllWindows().length === 0)
        createWindow();
});
electron_1.app.on("before-quit", () => {
    nextProcess?.kill();
});
