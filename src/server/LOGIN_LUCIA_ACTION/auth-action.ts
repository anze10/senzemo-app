"use server";

import { auth } from "src/server/LOGIN_LUCIA_ACTION/auth"; // pot do tvoje betterAuth() instance (prilagodi, če je drugje)
import { headers } from "next/headers";

export async function logOut() {
  const { success } = await auth.api.signOut({
    headers: await headers(),
  });
  return { success };
}

export async function getGoogleOauthConsentUrl() {
  try {
    const { url } = await auth.api.signInSocial({
      body: {
        provider: "google",
        scopes: [
          "https://www.googleapis.com/auth/spreadsheets",
          "https://www.googleapis.com/auth/drive",
        ],
        callbackURL: "/dashboard", // kam preusmeri po uspešni prijavi
      },
    });

    return { success: true, url };
  } catch (error: unknown) {
    return { success: false, error };
  }
}
