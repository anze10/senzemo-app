import { app, BrowserWindow, ipcMain, session } from "electron";
import path from "path";
import {
  getLocalPrinters,
  printZpl,
  type Tiskalnik,
} from "./printer/printer_server_side";

// --- Prepreči večkratni zagon app-a (rešuje "milijon belih oken") ---
const gotSingleInstanceLock = app.requestSingleInstanceLock();

if (!gotSingleInstanceLock) {
  app.quit();
  process.exit(0);
}

let pendingPortCallback: ((portId: string) => void) | null = null;
let mainWindow: BrowserWindow | null = null;

app.on("second-instance", () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

// --- IPC handlerji za tiskalnike ---
ipcMain.handle("printers:list-local", async () => getLocalPrinters());
ipcMain.handle(
  "printers:print",
  async (_event, target: Tiskalnik, zpl: string) => printZpl(target, zpl),
);

// renderer pošlje nazaj izbran serial port
ipcMain.on("serial-port-selected", (_event, portId: string) => {
  if (pendingPortCallback) {
    pendingPortCallback(portId);
    pendingPortCallback = null;
  }
});

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 850,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  // Electron je samo "tanek ovoj" okoli žive, produkcijske web app - NE
  // poganja lokalnega Next.js serverja, NE potrebuje direktnega dostopa
  // do baze. Vsa logika (auth, DB, itd.) teče na centralnem strežniku,
  // enako kot pri dostopu preko brskalnika.
  mainWindow.loadURL("https://tool.senzemo.com");

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  session.defaultSession.on(
    "select-serial-port",
    (event, portList, webContents, callback) => {
      event.preventDefault();
      pendingPortCallback = callback;
      webContents.send("serial-port-list", portList);
    },
  );

  session.defaultSession.setPermissionCheckHandler(
    (webContents, permission) => {
      return permission === "serial";
    },
  );

  session.defaultSession.setDevicePermissionHandler((details) => {
    return details.deviceType === "serial";
  });

  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
