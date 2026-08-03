import net from "net";
import os from "os";
import { exec, execFile } from "child_process";
import { unlink, writeFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { randomUUID } from "crypto";

// ============================================================
// 1. DIREKTEN RAW SOCKET (port 9100) — za tiskalnike, ki NISO
//    registrirani v OS print sistemu, samo poznaš njihov IP.
//    Deluje na VSEH OS, mimo CUPS/WinSpool v celoti.
// ============================================================
export function printZplRaw(
  host: string,
  zpl: string,
  port = 9100,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();

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

export async function getSystemPrinters(): Promise<string[]> {
  const platform = os.platform();

  if (platform === "win32") {
    return new Promise((resolve) => {
      exec(
        'powershell -Command "Get-Printer | Select-Object -ExpandProperty Name"',
        (error, stdout) => {
          if (error) return resolve([]);
          resolve(
            stdout
              .split("\n")
              .map((s) => s.trim())
              .filter(Boolean),
          );
        },
      );
    });
  }

  // Linux in macOS oba uporabljata CUPS - vrne VSE registrirane
  // tiskalnike, ne glede na USB/omrežno povezavo
  return new Promise((resolve) => {
    exec("lpstat -p", (error, stdout) => {
      if (error) return resolve([]);
      const printers = stdout
        .split("\n")
        .filter((line) => line.startsWith("printer "))
        .map((line) => line.split(" ")[1]);
      resolve(printers);
    });
  });
}

export async function printZplSystem(
  printerName: string,
  zpl: string,
): Promise<void> {
  const platform = os.platform();
  const tmpFile = path.join(tmpdir(), `zpl-${randomUUID()}.txt`);
  await writeFile(tmpFile, zpl, "utf-8");

  return new Promise((resolve, reject) => {
    if (platform === "win32") {
      const psScript = path.join(__dirname, "rawprint.ps1");
      execFile(
        "powershell",
        [
          "-ExecutionPolicy",
          "Bypass",
          "-File",
          psScript,
          "-PrinterName",
          printerName,
          "-FilePath",
          tmpFile,
        ],
        async (error) => {
          await unlink(tmpFile).catch(() => {});
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        },
      );
    } else {
      execFile(
        "lp",
        ["-d", printerName, "-o", "raw", tmpFile],
        async (error) => {
          await unlink(tmpFile).catch(() => {});
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        },
      );
    }
  });
}

// ============================================================
// 3. Poenoten vmesnik
// ============================================================

export type Tiskalnik =
  // OS-registriran tiskalnik (USB ALI omrežni, dodan preko CUPS/Windows)
  | { type: "system"; name: string }
  // Direkten raw socket na IP - tiskalnik NI registriran v OS-u
  | { type: "raw"; host: string; port?: number };

export async function printZpl(target: Tiskalnik, zpl: string): Promise<void> {
  if (target.type === "raw") {
    return printZplRaw(target.host, zpl, target.port);
  }
  return printZplSystem(target.name, zpl);
}

// Ohranjeno za nazaj-kompatibilnost imen, če jih kje še uvažaš
export const getLocalPrinters = getSystemPrinters;
