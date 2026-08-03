"use server";

import { auth } from "./auth";
import { headers } from "next/headers";
import crypto from "crypto";

export async function inviteUser(
  email: string,
  name: string,
  role: "user" | "admin" | ("user" | "admin")[] = "user",
) {
  const requestHeaders = await headers();

  // 1. Ustvari uporabnika z naključnim, začasnim geslom.
  //    Uporabnik ga nikoli ne vidi/uporabi - takoj sledi reset flow.
  const tempPassword = crypto.randomBytes(24).toString("hex");

  const { user } = await auth.api.createUser({
    body: {
      email,
      name,
      password: tempPassword,
      role,
    },
    headers: requestHeaders, // potrebno, da Better Auth preveri da je klicatelj admin
  });

  // 2. Sproži "nastavi geslo" email (uporabi isti sendResetPassword iz auth.ts)
  await auth.api.requestPasswordReset({
    body: {
      email,
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/resetpass`, // uporabnik bo preusmerjen na to stran po kliku na link v emailu
    },
  });

  return { success: true, userId: user.id };
}
