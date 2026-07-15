import { app, BrowserWindow } from "electron";
import path from "path";
import { spawn } from "child_process";
let mainWindow = null;
let nextProcess = null;
const isDev = !app.isPackaged;
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 850,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
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
async function startNextServer() {
    if (isDev)
        return; // dev server že teče preko "bun run dev"
    const appPath = path.join(process.resourcesPath, "app");
    const nextBin = path.join(appPath, "node_modules", ".bin", "next");
    nextProcess = spawn(nextBin, ["start"], {
        cwd: appPath,
        env: { ...process.env, PORT: "3000" },
        shell: true,
    });
    nextProcess.stdout?.on("data", (d) => console.log(`[next] ${d.toString()}`));
    nextProcess.stderr?.on("data", (d) => console.error(`[next] ${d.toString()}`));
    await new Promise((resolve) => setTimeout(resolve, 3000));
}
app.whenReady().then(async () => {
    await startNextServer();
    createWindow();
});
app.on("window-all-closed", () => {
    if (process.platform !== "darwin")
        app.quit();
});
app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0)
        createWindow();
});
app.on("before-quit", () => {
    nextProcess?.kill();
});
