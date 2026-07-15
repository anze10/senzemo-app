import { nextCookies } from "better-auth/next-js";
import { betterAuth } from "better-auth";

export const auth = betterAuth({
    appName: "autizem",
    plugins: [nextCookies()],
});
