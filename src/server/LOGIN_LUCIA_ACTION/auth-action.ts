"use server";

import { auth } from "src/server/LOGIN_LUCIA_ACTION/auth"; // pot do tvoje betterAuth() instance (prilagodi, če je drugje)
import { headers } from "next/headers";

export async function logOut() {
  const { success } = await auth.api.signOut({
    headers: await headers(),
  });
  return { success };
}
