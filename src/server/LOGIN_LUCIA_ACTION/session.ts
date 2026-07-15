"use server";
import { cookies } from "next/headers";
import { cache } from "react";
// import {
//   type SessionValidationResult,
//   validateSessionToken,
// } from "./validate_session";

import { headers } from "next/headers";
import { auth } from "src/server/LOGIN_LUCIA_ACTION/auth"; // pot do tvojega betterAuth() instance

export const getCurrentSession = cache(async () => {
  const result = await auth.api.getSession({
    headers: await headers(),
  });

  if (!result) {
    return { session: null, user: null };
  }

  return { session: result.session, user: result.user };
});

export async function setSessionTokenCookie(
  token: string,
  expiresAt: Date,
): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set("session", token, {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/",
  });
}

export async function deleteSessionTokenCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set("session", "", {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
    path: "/",
  });
}
