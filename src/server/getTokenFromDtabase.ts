import { googleOAuthClient } from "./googleOauth";

export default async function getTokenFromDatabase(code: string, codeVerifier: string, state: string) {
    try {
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
        } catch (error) {
            console.error("Error fetching user info:", error);
            return new Response("Failed to fetch user info", { status: 500 });
        }

        return googleData;
    } catch (error) {
        console.error("Error getting token from database:", error);
        return new Response("Failed to get token from database", { status: 500 });
    }
}

