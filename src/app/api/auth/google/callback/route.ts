"use server"
import { googleOAuthClient } from "src/server/googleOauth";
import { lucia } from "src/server/lucia";
import { prisma } from "src/server/prisma";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import bcrypt from "bcrypt"; 

export async function GET(req: NextRequest, res: Response) {
    try {
        console.log("Incoming request:", req.url);

        const url = req.nextUrl;
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");

        console.log("Received query parameters:", { code, state });

        if (!code || !state) {
            console.error("Missing code or state in query parameters");
            return new Response("Invalid Request: Missing code or state", { status: 400 });
        }

        const getCookieValue = async (cookieName: string) => {
            const allCookies = await cookies();
            const cookie = allCookies.get(cookieName);
            console.log(`Cookie [${cookieName}]:`, cookie);
            return cookie ? cookie.value : null;
        };

        const codeVerifier = await getCookieValue("codeVerifier");
        const savedState = await getCookieValue("state");

        if (!codeVerifier || !savedState) {
            console.error("Missing required cookies: codeVerifier or state");
            return new Response("Invalid Request: Missing cookies", { status: 400 });
        }

        if (state !== savedState) {
            console.error("State mismatch", { received: state, expected: savedState });
            return new Response("Invalid Request: State mismatch", { status: 400 });
        }

        let accessToken: string;
        try {
            const response = await googleOAuthClient.validateAuthorizationCode(code, codeVerifier);
            console.log("Authorization Code Response:", response);
            accessToken = response.accessToken();

            if (!accessToken || typeof accessToken !== "string") {
                console.error("Invalid access token:", accessToken);
                return new Response("Invalid access token", { status: 400 });
            }
        } catch (error) {
            console.error("Error validating authorization code:", error);
            return new Response("Failed to validate authorization code", { status: 500 });
        }

        let googleData;
        try {
            const googleResponse = await fetch("https://www.googleapis.com/oauth2/v1/userinfo", {
                headers: { Authorization: `Bearer ${accessToken}` },
            });

            console.log("Google API response status:", googleResponse.status);

            if (!googleResponse.ok) {
                const errorBody = await googleResponse.text();
                console.error("Failed to fetch user info:", errorBody);
                return new Response("Failed to fetch user info", { status: 500 });
            }

            googleData = await googleResponse.json();
            console.log("Google User Data:", googleData);

            if (!googleData || !googleData.email || !googleData.name) {
                console.error("Invalid Google user data:", googleData);
                return new Response("Invalid user data from Google", { status: 400 });
            }
        } catch (error) {
            console.error("Error fetching user data from Google:", error);
            return new Response("Failed to fetch user data", { status: 500 });
        }

        const picture = googleData.picture ?? null;

        let user;
        try {
            const defaultPassword = "123456789";
            const hashedDefaultPassword = await bcrypt.hash(defaultPassword, 10);
            user = await prisma.user.upsert({
                where: { email: googleData.email },
                update: {
                    name: googleData.name,
                    picture: picture,
                },
                create: {
                    name: googleData.name,
                    email: googleData.email,
                    picture: picture,
                    role: "user",
                    hashedPassword: hashedDefaultPassword,
                },
            });
            console.log("User upserted successfully:", user);
        } catch (error) {
            console.error("Error upserting user in database:", error);
            return new Response("Database operation failed", { status: 500 });
        }

        let session, sessionCookie;
        try {
            session = await lucia.createSession(user.id, {});
            console.log("Session created:", session);

            if (!session || !session.id) {
                throw new Error("Session creation failed");
            }

            sessionCookie = await lucia.createSessionCookie(session.id);
            console.log("Session cookie created:", sessionCookie);

            if (!sessionCookie || !sessionCookie.name || !sessionCookie.value) {
                throw new Error("Invalid session cookie");
            }

            (await cookies()).set(sessionCookie.name, sessionCookie.value, {
                ...sessionCookie.attributes,
                secure: process.env.NODE_ENV === "production",
                httpOnly: true,
                sameSite: "strict",
            });
        } catch (error) {
            console.error("Error creating session or setting cookie:", error);
            return new Response("Session management failed", { status: 500 });
        }

        console.log("User authenticated successfully:", {
            email: googleData.email,
            userId: user.id,
        });

        try {
            
            return NextResponse.redirect("http://localhost:3000/podstran");
        } catch (error) {
            console.error("Unexpected error:", error);
            return new Response("Internal Server Error", { status: 500 });
        }
    } catch (error) {
        console.error("Unexpected error:", error);
        return new Response("Internal Server Error", { status: 500 });
    }
}