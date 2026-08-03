"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLocalPrinters = void 0;
exports.printZplRaw = printZplRaw;
exports.getSystemPrinters = getSystemPrinters;
exports.printZplSystem = printZplSystem;
exports.printZpl = printZpl;
const net_1 = __importDefault(require("net"));
const os_1 = __importDefault(require("os"));
const child_process_1 = require("child_process");
const promises_1 = require("fs/promises");
const os_2 = require("os");
const path_1 = __importDefault(require("path"));
const crypto_1 = require("crypto");
// ============================================================
// 1. DIREKTEN RAW SOCKET (port 9100) — za tiskalnike, ki NISO
//    registrirani v OS print sistemu, samo poznaš njihov IP.
//    Deluje na VSEH OS, mimo CUPS/WinSpool v celoti.
// ============================================================
function printZplRaw(host, zpl, port = 9100) {
    return new Promise((resolve, reject) => {
        const socket = new net_1.default.Socket();
        socket.connect(port, host, () => {
            socket.write(zpl, "utf-8", () => {
                socket.end();
            });
        });
        socket.on("close", () => resolve());
        socket.on("error", (err) => reject(err));
        socket.setTimeout(5000, () => {
            socket.destroy();
            reject(new Error(`Povezava na tiskalnik ${host}:${port} je potekla`));
        });
    });
}
// ============================================================
// 2. OS-REGISTRIRANI tiskalniki — USB ALI omrežni, če so bili
//    dodani v sistemski print queue (CUPS na Linux/Mac,
//    Windows Nastavitve → Tiskalniki na Windows)
// ============================================================
async function getSystemPrinters() {
    const platform = os_1.default.platform();
    if (platform === "win32") {
        return new Promise((resolve) => {
            (0, child_process_1.exec)('powershell -Command "Get-Printer | Select-Object -ExpandProperty Name"', (error, stdout) => {
                if (error)
                    return resolve([]);
                resolve(stdout
                    .split("\n")
                    .map((s) => s.trim())
                    .filter(Boolean));
            });
        });
    }
    // Linux in macOS oba uporabljata CUPS - vrne VSE registrirane
    // tiskalnike, ne glede na USB/omrežno povezavo
    return new Promise((resolve) => {
        (0, child_process_1.exec)("lpstat -p", (error, stdout) => {
            if (error)
                return resolve([]);
            const printers = stdout
                .split("\n")
                .filter((line) => line.startsWith("printer "))
                .map((line) => line.split(" ")[1]);
            resolve(printers);
        });
    });
}
async function printZplSystem(printerName, zpl) {
    const platform = os_1.default.platform();
    const tmpFile = path_1.default.join((0, os_2.tmpdir)(), `zpl-${(0, crypto_1.randomUUID)()}.txt`);
    await (0, promises_1.writeFile)(tmpFile, zpl, "utf-8");
    return new Promise((resolve, reject) => {
        if (platform === "win32") {
            const psScript = path_1.default.join(__dirname, "rawprint.ps1");
            (0, child_process_1.execFile)("powershell", [
                "-ExecutionPolicy",
                "Bypass",
                "-File",
                psScript,
                "-PrinterName",
                printerName,
                "-FilePath",
                tmpFile,
            ], async (error) => {
                await (0, promises_1.unlink)(tmpFile).catch(() => { });
                if (error) {
                    reject(error);
                }
                else {
                    resolve();
                }
            });
        }
        else {
            (0, child_process_1.execFile)("lp", ["-d", printerName, "-o", "raw", tmpFile], async (error) => {
                await (0, promises_1.unlink)(tmpFile).catch(() => { });
                if (error) {
                    reject(error);
                }
                else {
                    resolve();
                }
            });
        }
    });
}
async function printZpl(target, zpl) {
    if (target.type === "raw") {
        return printZplRaw(target.host, zpl, target.port);
    }
    return printZplSystem(target.name, zpl);
}
// Ohranjeno za nazaj-kompatibilnost imen, če jih kje še uvažaš
exports.getLocalPrinters = getSystemPrinters;
