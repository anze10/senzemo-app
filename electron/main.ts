import { app, BrowserWindow, ipcMain, session } from "electron";
import path from "path";
import { appendFileSync, existsSync, writeFileSync } from "fs";
import net from "net";
import { ChildProcess, spawn } from "child_process";
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
let nextProcess: ChildProcess | null = null;

const isDev = !app.isPackaged;

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

  mainWindow.loadURL("http://localhost:3000");

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// TCP-level preverjanje namesto fetch() - neodvisno od Chromium network service
function waitForPortOpen(
  port: number,
  host = "127.0.0.1",
  maxAttempts = 40,
): Promise<void> {
  return new Promise((resolve, reject) => {
    let attempts = 0;

    const tryConnect = () => {
      attempts++;
      console.log(
        `[main] Preverjam port ${port}, poskus ${attempts}/${maxAttempts}...`,
      );
      const socket = new net.Socket();

      socket.once("connect", () => {
        console.log(`[main] Port ${port} je odprt, server je pripravljen.`);
        socket.destroy();
        resolve();
      });

      socket.once("error", () => {
        socket.destroy();
        if (attempts >= maxAttempts) {
          reject(
            new Error(
              `Next.js server ni odprl porta ${port} po ${maxAttempts} poskusih.`,
            ),
          );
          return;
        }
        setTimeout(tryConnect, 500);
      });

      socket.connect(port, host);
    };

    tryConnect();
  });
}

async function startNextServer(): Promise<void> {
  if (isDev) return; // dev server že teče preko "bun run dev"

  const appPath = path.join(process.resourcesPath, "app");
  const nextBin = path.join(
    appPath,
    "node_modules",
    "next",
    "dist",
    "bin",
    "next",
  );

  const logPath = path.join(app.getPath("userData"), "next.log");
  writeFileSync(logPath, `--- Nov zagon ${new Date().toISOString()} ---\n`);

  console.log(`[main] appPath: ${appPath}`);
  console.log(`[main] nextBin: ${nextBin}`);
  console.log(`[main] nextBin obstaja: ${existsSync(nextBin)}`);
  console.log(`[main] Next izpis se piše v: ${logPath}`);

  if (!existsSync(nextBin)) {
    throw new Error(
      `Next.js binary ne obstaja na poti: ${nextBin}. Preveri build konfiguracijo (asar/files).`,
    );
  }

  nextProcess = spawn(process.execPath, [nextBin, "start"], {
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
    appendFileSync(logPath, `[ERROR spawn] ${err.message}\n`);
  });

  nextProcess.on("exit", (code, signal) => {
    console.log(`[main] next proces končan, code: ${code}, signal: ${signal}`);
    appendFileSync(logPath, `[EXIT] code=${code} signal=${signal}\n`);
  });

  nextProcess.stdout?.on("data", (d: Buffer) => {
    const text = d.toString();
    console.log(`[next] ${text}`);
    appendFileSync(logPath, text);
  });
  nextProcess.stderr?.on("data", (d: Buffer) => {
    const text = d.toString();
    console.error(`[next] ${text}`);
    appendFileSync(logPath, text);
  });

  console.log("[main] Čakam da next server odpre port 3000...");
  await waitForPortOpen(3000);
  console.log("[main] Next server pripravljen.");
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

  try {
    await startNextServer();
  } catch (err) {
    console.error("[main] KRITIČNA NAPAKA pri zagonu Next serverja:", err);
  }

  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on("before-quit", () => {
  nextProcess?.kill();
});
