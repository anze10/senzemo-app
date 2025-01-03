"use server";
import { googleOAuthClient } from "src/server/googleOauth";
import { lucia } from "src/server/lucia";
import { prisma } from "src/server/prisma";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import argon2 from "argon2";
import { getBaseUrl } from "~/lib/getBaseUrl";

export async function GET(req: NextRequest) {
  try {
    console.log("Incoming request:", req.url);

    const url = req.nextUrl;
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    if (!code || !state) {
      console.error("Missing code or state in query parameters");
      return new Response("Invalid Request: Missing code or state", { status: 400 });
    }

    const getCookieValue = async (cookieName: string) => {
      const allCookies = await cookies();
      const cookie = allCookies.get(cookieName);
      return cookie ? cookie.value : null;
    };

    const codeVerifier = await getCookieValue("codeVerifier");
    const savedState = await getCookieValue("state");

    if (!codeVerifier || !savedState || state !== savedState) {
      console.error("State mismatch or missing cookies");
      return new Response("Invalid Request", { status: 400 });
    }

    let accessToken: string;
    let response;
    try {
      response = await googleOAuthClient.validateAuthorizationCode(
        code,
        codeVerifier
      );
      console.log("Google OAuth response:", response);
      accessToken = response.accessToken();

      if (!accessToken || typeof accessToken !== "string") {
        console.error("Invalid access token");
        return new Response("Invalid access token", { status: 400 });
      }
    } catch (error) {
      console.error("Error validating authorization code:", error);
      return new Response("Failed to validate authorization code", { status: 500 });
    }

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

    const picture = googleData.picture ?? null;

    // Upsert the user
    let user;
    try {
      const defaultPassword = "123456789";
      const hashedDefaultPassword = await argon2.hash(defaultPassword);

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
    } catch (error) {
      console.error("Error upserting user:", error);
      return new Response("Database operation failed", { status: 500 });
    }

    // Upsert tokens after ensuring user exists
    try {
      await prisma.googleTokens.upsert({
        where: { userId: user.id },
        update: {
          accessToken: response.accessToken(),
          idToken: response.idToken(),
          scope: response.scopes().join(" "),
          tokenType: response.tokenType(),
          expiryDate: new Date(
            Date.now() + response.accessTokenExpiresInSeconds() * 1000
          ),
        },
        create: {
          userId: user.id,
          accessToken: response.accessToken(),
          idToken: response.idToken(),
          scope: response.scopes().join(" "),
          tokenType: response.tokenType(),
          expiryDate: new Date(
            Date.now() + response.accessTokenExpiresInSeconds() * 1000
          ),
        },
      });
    } catch (error) {
      console.error("Error upserting tokens:", error);
      return new Response("Failed to save tokens", { status: 500 });
    }

    // Create session and session cookie
    let session, sessionCookie;
    try {
      session = await lucia.createSession(user.id, {});
      sessionCookie = await lucia.createSessionCookie(session.id);

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

    return Response.redirect(`${getBaseUrl()}/podstran`, 307);
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
