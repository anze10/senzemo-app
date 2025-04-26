import { OAuth2Tokens } from "arctic";
import { prisma } from "./prisma";
import { google } from "src/server/LOGIN_LUCIA_ACTION/googleOauth";

export default async function SaveToken(token: OAuth2Tokens, userId: number) {
    try {
        await prisma.googleTokens.upsert({
            where: { userId: userId },
            update: {
                accessToken: token.accessToken(),
                accessTokenExpiresAt: token.accessTokenExpiresAt(),
                accessTokenExpiresInSeconds: token.accessTokenExpiresInSeconds(),
                idToken: token.idToken(),
                refreshToken: token.refreshToken(),
                scopes: token.scopes().join(','),
                tokenType: token.tokenType(),
                hasRefreshToken: token.hasRefreshToken(),
                hasScopes: token.hasScopes(),
                data: token.data,

            },
            create: {
                userId: userId,
                accessToken: token.accessToken(),
                accessTokenExpiresAt: token.accessTokenExpiresAt(),
                accessTokenExpiresInSeconds: token.accessTokenExpiresInSeconds(),
                idToken: token.idToken(),
                refreshToken: token.refreshToken(),
                scopes: token.scopes().join(','),
                tokenType: token.tokenType(),
                hasRefreshToken: token.hasRefreshToken(),
                hasScopes: token.hasScopes(),
                data: token.data,
            },
        });

        console.log("Token saved successfully", { userId });
    } catch (error) {
        console.error("Error saving token", error);
        throw new Error("Failed to save token");
    }
}


export async function GetAccessToken(userId: number): Promise<string> {
    try {
        // Fetch the token from the database
        const token = await prisma.googleTokens.findUnique({ where: { userId } });

        if (!token) {
            throw new Error(`No token found for user with ID: ${userId}`);
        }

        const currentTime = new Date();
        const fiveMinutesFromNow = new Date(currentTime.getTime() + 5 * 60 * 1000);

        // Check if the token is about to expire or has already expired
        if (token.accessTokenExpiresAt <= fiveMinutesFromNow) {
            console.log("Access token is expired or will expire soon. Refreshing...");

            if (!token.refreshToken) {
                throw new Error(`No refresh token available for user with ID: ${userId}`);
            }

            // Use the refresh token to get a new access token
            const newToken = await google.refreshAccessToken(token.refreshToken);

            SaveToken(newToken, userId);

            console.log("Access token refreshed successfully.");
            return newToken.accessToken();
        }

        console.log("Access token is still valid.");
        return token.accessToken;
    } catch (error) {
        console.error("Error fetching or refreshing access token:", error);
        throw new Error("Failed to get access token");
    }
}