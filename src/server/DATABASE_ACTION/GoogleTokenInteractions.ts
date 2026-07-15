// src/server/.../SaveToken.ts (ali kjerkoli je ta datoteka)
import type { OAuth2Tokens } from "arctic";
import { prisma } from "src/server/DATABASE_ACTION/prisma";
import { google } from "src/server/LOGIN_LUCIA_ACTION/googleOauth"; // TODO: premakni izven LOGIN_LUCIA_ACTION, ni več Lucia-specifično

const GOOGLE_PROVIDER_ID = "google";

export default async function SaveToken(token: OAuth2Tokens, userId: number) {
  try {
    await prisma.account.updateMany({
      where: {
        userId,
        providerId: GOOGLE_PROVIDER_ID,
      },
      data: {
        accessToken: token.accessToken(),
        accessTokenExpiresAt: token.accessTokenExpiresAt(),
        ...(token.hasRefreshToken()
          ? { refreshToken: token.refreshToken() }
          : {}),
        idToken: token.idToken(),
        scope: token.scopes().join(","),
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
    const account = await prisma.account.findFirst({
      where: {
        userId,
        providerId: GOOGLE_PROVIDER_ID,
      },
    });

    if (!account || !account.accessToken) {
      throw new Error(
        `No Google account/token found for user with ID: ${userId}`,
      );
    }

    const currentTime = new Date();
    const fiveMinutesFromNow = new Date(currentTime.getTime() + 5 * 60 * 1000);

    const isExpiredOrMissing =
      !account.accessTokenExpiresAt ||
      account.accessTokenExpiresAt <= fiveMinutesFromNow;

    if (isExpiredOrMissing) {
      console.log("Access token is expired or will expire soon. Refreshing...");

      if (!account.refreshToken) {
        throw new Error(
          `No refresh token available for user with ID: ${userId}`,
        );
      }

      const newToken = await google.refreshAccessToken(account.refreshToken);

      await SaveToken(newToken, userId); // <- dodan await, prej je manjkal

      console.log("Access token refreshed successfully.");
      return newToken.accessToken();
    }

    console.log("Access token is still valid.");
    return account.accessToken;
  } catch (error) {
    console.error("Error fetching or refreshing access token:", error);
    throw new Error("Failed to get access token");
  }
}
