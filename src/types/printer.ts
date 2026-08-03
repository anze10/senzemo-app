// Čisto tipska definicija, brez Node odvisnosti - varno za uvoz
// v client-side kodo (React/Zustand).

export type Tiskalnik =
  // OS-registriran tiskalnik (USB ALI omrežni, dodan preko CUPS/Windows)
  | { type: "system"; name: string }
  // Direkten raw socket na IP - tiskalnik NI registriran v OS-u
  | { type: "raw"; host: string; port?: number };
