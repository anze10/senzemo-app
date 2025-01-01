
"use server"
import { z } from "zod"

import { prisma } from "src/server/prisma"
import { Argon2id } from 'oslo/password'
import { lucia } from "src/server/lucia"
import { cookies } from "next/headers"
//import { NextResponse } from "next/server";
//import { signInSchema } from "./SignInForm"
// import { redirect } from "next/navigation"
// import { generateCodeVerifier, generateState } from "arctic"
// import { googleOAuthClient } from "src/server/googleOauth"


export const signInSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
})


export const signIn = async (values: z.infer<typeof signInSchema>) => {
    const user = await prisma.user.findUnique({
        where: {
            email: values.email
        }
    })
    if (!user || !user.hashedPassword) {
        return { success: false, error: "Invalid Credentials!" }
    }
    const passwordMatch = await new Argon2id().verify(user.hashedPassword, values.password)
    if (!passwordMatch) {
        return { success: false, error: "Invalid Credentials!" }
    }
    // successfully login
    const session = await lucia.createSession(user.id, {})
    const sessionCookie = await lucia.createSessionCookie(session.id)
        ; (await cookies()).set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes)
    return { success: true }
}