import { auth } from "~/server/LOGIN_LUCIA_ACTION/auth"; // preveri točno pot do tvoje betterAuth() instance
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(auth);
