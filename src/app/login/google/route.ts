import { generateCodeVerifier, generateState } from "arctic";
import { cookies } from "next/headers";
import { google } from "src/server//LOGIN_LUCIA_ACTION/googleOauth";

export async function GET(): Promise<Response> {
    const state = generateState();
    const codeVerifier = generateCodeVerifier();
    const url = google.createAuthorizationURL(state, codeVerifier, ["openid", "profile", "email",
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive",
        "https://www.googleapis.com/auth/userinfo.email",
        "https://www.googleapis.com/auth/userinfo.profile",]);
    const authorizationUrl = `${url}&access_type=offline&prompt=consent`;
    const cookieStore = await cookies();
    cookieStore.set("google_oauth_state", state, {
        path: "/",
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 10, // 10 minutes
        sameSite: "lax"
    });
    cookieStore.set("google_code_verifier", codeVerifier, {
        path: "/",
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 10, // 10 minutes
        sameSite: "lax"
    });

    return new Response(null, {
        status: 302,
        headers: {
            Location: authorizationUrl.toString()
        }
    });
}
