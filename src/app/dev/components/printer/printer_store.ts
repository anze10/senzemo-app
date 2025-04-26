// import { Tiskalnik } from "./printer_server_side";
// import { persist, createJSONStorage } from "zustand/middleware";
// import { create, type StateCreator } from "zustand";

// const initial_state: Tiskalnik = {
//     name: '',
//     url: 'http://localhost:631/printers'
// };
// interface PrinterState {
//     printer: Tiskalnik;
//     reset: () => void;
//     set_printer: (printer: Tiskalnik) => void;
//     get_current_printer: () => void;
// }

// const printer_callback: StateCreator<PrinterState> = (set) => ({
//     printer: initial_state,

//     reset: () => {
//         set(() => ({ printer: { ...initial_state } }));
//     },
//     set_printer: (printer: Tiskalnik) => {
//         set(() => ({ printer: { ...printer } }));
//     },
//     get_current_printer: () => {
//         return set;
//     }
// });

// export const usePrinterStore = create<PrinterState>()(
//     persist(printer_callback, {
//         name: "sensor-store",
//         storage: createJSONStorage(() => localStorage),
//     })
// );
//TO je neko sranje ki ne dela
