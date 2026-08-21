import { createAuthClient } from "better-auth/react";
import type { auth } from "./auth.ts";
import { inferAdditionalFields } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: "https://token-senzemo.vercel.app/api/auth",
  plugins: [inferAdditionalFields<typeof auth>()],
});
