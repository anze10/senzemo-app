/// <reference types="w3c-web-serial" />

import type { Tiskalnik } from "./printer";

declare global {
  interface Window {
    electronAPI?: {
      listPrinters: () => Promise<string[]>;
      printZpl: (target: Tiskalnik, zpl: string) => Promise<void>;
      onSerialPortRequest: (callback: (ports: unknown[]) => void) => void;
      selectSerialPort: (portId: string) => void;
    };
  }
}

export {};
