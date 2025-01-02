import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Tiskalnik } from './printer_server_side'; 


// Define the structure of the PrinterStore state
interface PrinterStore {
    printers: Tiskalnik[]; // Array to hold printers
    url_server: string;
    url_connection: string;
    setPrinters: (printers: Tiskalnik[], url_server: string, url_connection: string) => void; 
}

// Export the Zustand hook for the PrinterStore with persistence
export const usePrinterStore = create<PrinterStore>()(
    persist(
        (set) => ({
            printers: [], 
            url_server: "http://localhost:631",
            url_connection: "http://localhost:631/printers",
            setPrinters: (printers: Tiskalnik[], url_server: string, url_connection: string) => set({ printers, url_server, url_connection }), // Method to set printers
        }),
        {
            name: 'printer-store', // Unique name for the store in localStorage
            storage: createJSONStorage(() => localStorage), // Use localStorage for persistence
        }
    )
);
