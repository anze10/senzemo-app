"use server"
import { Argon2id } from "oslo/password";
import { PrismaClient } from "@prisma/client";
import { OAuth2Client } from "google-auth-library";

const prisma = new PrismaClient();
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID!; // Your Google OAuth Client ID
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!; // Your Google OAuth Client Secret
const REDIRECT_URI = "http://localhost:3000/api/auth/password/"; // Update with your redirect URI

const oAuth2Client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

export async function signIn(values: { email: string; password: string }) {
    // Step 1: Validate user credentials
    const user = await prisma.user.findUnique({
        where: { email: values.email },
    });

    if (!user || !user.hashedPassword) {
        throw new Error("Invalid Credentials!");
    }

    const passwordMatch = await new Argon2id().verify(user.hashedPassword, values.password);
    if (!passwordMatch) {
        throw new Error("Invalid Credentials!");
    }

    // Generate an authorization URL for Google OAuth 2.0
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: "offline", // Needed to get a refresh token
        scope: ["https://www.googleapis.com/auth/drive.readonly"],
        state: JSON.stringify({ userId: user.id }) // Pass user ID in the state parameter
    });

    console.log("Redirect to this URL:", authUrl);
    // Redirect user to authUrl
    return { success: true, redirectUrl: authUrl };
}

// This function should be triggered by a separate endpoint that handles the Google callback
export async function handleGoogleCallback(code: string, state: string) {
    const { userId } = JSON.parse(state); // Extract user ID from state

    const { tokens } = await oAuth2Client.getToken(code); // Exchange code for tokens

    // Save tokens in the database
    await prisma.googleTokens.update({
        where: { id: userId },
        data: {
            accessToken: tokens.access_token ?? undefined,
            refreshToken: tokens.refresh_token ?? undefined,
            expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
        },
    });

    return { success: true };
}
