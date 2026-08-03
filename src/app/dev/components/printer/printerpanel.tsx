// "use client";

// import { useState, useEffect } from "react";

// export function PrinterPanel() {
//   const [isElectron, setIsElectron] = useState(false);
//   const [printers, setPrinters] = useState<string[]>([]);
//   const [status, setStatus] = useState<string>("");

//   useEffect(() => {
//     // preveri šele po mountu (client-side), da se izogneš SSR/hydration mismatchu
//     setIsElectron(typeof window !== "undefined" && !!window.electronAPI);
//   }, []);

//   useEffect(() => {
//     if (!isElectron) return;
//     window.electronAPI!.listPrinters().then(setPrinters);
//   }, [isElectron]);

//   async function handlePrintUsb(printerName: string, zpl: string) {
//     if (!window.electronAPI) return;
//     setStatus("Tiskam...");
//     try {
//       await window.electronAPI.printZpl({ type: "usb", name: printerName }, zpl);
//       setStatus("Natisnjeno ✓");
//     } catch (err) {
//       setStatus(`Napaka: ${(err as Error).message}`);
//     }
//   }

//   async function handlePrintNetwork(host: string, zpl: string) {
//     if (!window.electronAPI) return;
//     setStatus("Tiskam...");
//     try {
//       await window.electronAPI.printZpl({ type: "network", host }, zpl);
//       setStatus("Natisnjeno ✓");
//     } catch (err) {
//       setStatus(`Napaka: ${(err as Error).message}`);
//     }
//   }

//   // --- Ključni del: app teče na webu (brskalnik brez Electrona) ---
//   if (!isElectron) {
//     return (
//       <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-800">
//         Tiskanje nalepk je na voljo samo v namizni aplikaciji (Electron), ne
//         v spletni verziji. Prenesi in zaženi namizno aplikacijo za dostop do
//         te funkcije.
//       </div>
//     );
//   }

//   // --- Teče v Electronu ---
//   return (
//     <div className="space-y-4">
//       <div>
//         <h3 className="font-medium">Zaznani lokalni tiskalniki</h3>
//         <ul>
//           {printers.map((p) => (
//             <li key={p}>{p}</li>
//           ))}
//         </ul>
//       </div>

//       <button
//         onClick={() => handlePrintUsb(printers[0], "^XA^FO50,50^ADN,36,20^FDTest^FS^XZ")}
//         className="rounded bg-blue-600 px-4 py-2 text-white"
//       >
//         Testni tisk (USB)
//       </button>

//       {status && <p>{status}</p>}
//     </div>
//   );
// }