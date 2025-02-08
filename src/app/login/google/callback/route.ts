"use server"
import { generateSessionToken, createSession, } from "src/server/LOGIN_LUCIA_ACTION/validate_session";
import { setSessionTokenCookie } from "src/server/LOGIN_LUCIA_ACTION/session";
import { google } from "src/server/LOGIN_LUCIA_ACTION/googleOauth";
import { cookies } from "next/headers";
import { decodeIdToken } from "arctic";

import type { OAuth2Tokens } from "arctic";
import { createUser, getUserFromGoogleId } from "~/app/dev/components/GetUser";

import SaveToken from "~/server/DATABASE_ACTION/GoogleTokenInteractions";

interface Claims {
    sub: string;
    name: string;
    // Add other properties if needed
}

export async function GET(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const cookieStore = await cookies();
    const storedState = cookieStore.get("google_oauth_state")?.value ?? null;
    const codeVerifier = cookieStore.get("google_code_verifier")?.value ?? null;
    if (code === null || state === null || storedState === null || codeVerifier === null) {
        console.log("Missing code, state, or code verifier", { code, state, storedState, codeVerifier });
        return new Response(null, {
            status: 400
        });
    }
    if (state !== storedState) {
        return new Response(null, {
            status: 400
        });
    }

    let tokens: OAuth2Tokens;
    try {
        tokens = await google.validateAuthorizationCode(code, codeVerifier);
    } catch (error) {
        console.error("Error validating authorization code:", error);
        // Invalid code or client credentials
        return new Response(null, {
            status: 400
        });
    }


    const accessToken = tokens.accessToken();


    console.log("Access token", { accessToken });
    console.log("ID token", { idToken: tokens.idToken() });
    console.log("Refresh token", { refreshToken: tokens.refreshToken() });
    let googleData;
    try {
        const googleResponse = await fetch(
            "https://www.googleapis.com/oauth2/v1/userinfo",
            {
                headers: { Authorization: `Bearer ${accessToken}` },
            }
        );

        if (!googleResponse.ok) {
            console.error("Failed to fetch user info");
            return new Response("Failed to fetch user info", { status: 500 });
        }

        googleData = await googleResponse.json();

        if (!googleData?.email || !googleData?.name) {
            console.error("Invalid user data from Google");
            return new Response("Invalid user data", { status: 400 });
        }
    } catch (error) {
        console.error("Error fetching user data:", error);
        return new Response("Failed to fetch user data", { status: 500 });
    }
    const claims: Claims = decodeIdToken(tokens.idToken()) as Claims;
    const googleUserId = claims.sub;
    const username = claims.name;



    const existingUser = await getUserFromGoogleId(googleUserId);

    if (existingUser !== null) {
        const sessionToken = generateSessionToken();
        console.log("Creating session", { sessionToken });
        const session = await createSession(sessionToken, Number(existingUser.id));

        console.log("Session created", { sessionToken, session });
        await SaveToken(tokens, session.userId);

        await setSessionTokenCookie(sessionToken, session.expiresAt);
        console.log("Session cookie set", { sessionToken, session });
        return new Response(null, {
            status: 302,
            headers: {
                Location: "/dashboard"
            }
        });
    }

    // TODO: Replace this with your own DB query.
    const user = await createUser(googleUserId, username, googleData);

    const sessionToken = generateSessionToken();
    console.log("Creating session", { sessionToken, user });
    const session = await createSession(sessionToken, Number(user.id));
    console.log("Session created", { sessionToken, session });
    await SaveToken(tokens, session.userId);
    await setSessionTokenCookie(sessionToken, session.expiresAt);
    console.log("Session cookie set", { sessionToken, session });
    return new Response(null, {
        status: 302,
        headers: {
            Location: "/dashboard"
        }
    });
}
// jebes vercel
