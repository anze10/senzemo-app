"use server";

import { z } from "zod";
import { prisma } from "src/server/prisma";
import { Argon2id } from "oslo/password";
import { lucia } from "src/server/lucia";
import { cookies } from "next/headers";
import { signInSchema } from "~/validators/auth_due";

export async function signIn(values: z.infer<typeof signInSchema>) {
  console.log("Starting signIn function...");

  // Validate input
  const validationResult = signInSchema.safeParse(values);
  if (!validationResult.success) {
    console.error("Validation failed:", validationResult.error);
    throw new Error("Invalid input data.");
  }
  console.log("Validation passed:", values);

  try {
    // Fetch user from database
    const user = await prisma.user.findUnique({
      where: { email: values.email },
    });
    console.log("Fetched user:", user);

    if (!user || !user.hashedPassword) {
      console.error("User not found or missing hashedPassword.");
      throw new Error("Invalid Credentials!");
    }

    // Verify password
    const argon2 = new Argon2id();
    console.log("Verifying password...");
    const passwordMatch = await argon2.verify(
      user.hashedPassword,
      values.password
    );
    console.log("Password match result:", passwordMatch);

    if (!passwordMatch) {
      console.error("Password verification failed.");
      throw new Error("Invalid Credentials!");
    }

    // Create session
    console.log("Creating session...");
    const session = await lucia.createSession(user.id, {});
    console.log("Created session:", session);

    // Create session cookie
    console.log("Creating session cookie...");
    const sessionCookie = await lucia.createSessionCookie(session.id);
    console.log("Session cookie created:", sessionCookie);

    // Set cookie in headers
    console.log("Setting session cookie...");
    const cookieHandler = await cookies();
    cookieHandler.set(
      sessionCookie.name,
      sessionCookie.value,
      sessionCookie.attributes
    );
    console.log("Session cookie set successfully.");

    return { success: true };
  } catch (error) {
    console.error("Error in signIn function:", error);
    throw error; // Rethrow error for upstream handling
  }
}
