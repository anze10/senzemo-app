import { createJSONStorage } from "zustand/middleware";

// Create a safe storage that works in both client and server environments
export const createSafeStorage = () => {
  if (typeof window === "undefined") {
    // Server-side: return a no-op storage
    return createJSONStorage(() => ({
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    }));
  }
  
  // Client-side: return localStorage
  return createJSONStorage(() => localStorage);
};
