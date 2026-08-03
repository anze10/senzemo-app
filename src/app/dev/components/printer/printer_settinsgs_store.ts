import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Tiskalnik } from "~/types/printer";
import { createSafeStorage } from "~/lib/storage";

interface PrinterStore {
  // seznam OS-registriranih tiskalnikov (USB ali omrežnih, dodanih v CUPS/Windows)
  localPrinters: string[];
  // trenutno izbran tiskalnik
  selectedPrinter: Tiskalnik | null;

  setLocalPrinters: (printers: string[]) => void;
  selectSystemPrinter: (name: string) => void;
  selectRawPrinter: (host: string, port?: number) => void;
  clearSelectedPrinter: () => void;
}

export const usePrinterStore = create<PrinterStore>()(
  persist(
    (set) => ({
      localPrinters: [],
      selectedPrinter: null,

      setLocalPrinters: (printers) => set({ localPrinters: printers }),

      selectSystemPrinter: (name) =>
        set({ selectedPrinter: { type: "system", name } }),

      selectRawPrinter: (host, port) =>
        set({ selectedPrinter: { type: "raw", host, port } }),

      clearSelectedPrinter: () => set({ selectedPrinter: null }),
    }),
    {
      name: "printer-store",
      storage: createSafeStorage(),
    },
  ),
);
