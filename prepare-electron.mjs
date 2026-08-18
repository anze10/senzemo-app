// Cross-platform priprava dist-electron mape - deluje enako na Linux, macOS IN Windows,
// ker uporablja Node fs API namesto Unix-specifičnih shell ukazov (mkdir -p, cp)
import { copyFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

const distDir = "dist-electron";
const distPrinterDir = join(distDir, "printer");

if (!existsSync(distDir)) mkdirSync(distDir, { recursive: true });
if (!existsSync(distPrinterDir)) mkdirSync(distPrinterDir, { recursive: true });

copyFileSync(join("electron", "package.json"), join(distDir, "package.json"));

copyFileSync(
  join("electron", "printer", "rawprint.ps1"),
  join(distPrinterDir, "rawprint.ps1"),
);

console.log(
  "dist-electron pripravljena (package.json + rawprint.ps1 kopirana)",
);
