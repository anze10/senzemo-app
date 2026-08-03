import { auth } from "./auth";

export async function GetAccessToken(userId: number): Promise<string> {
  const { accessToken } = await auth.api.getAccessToken({
    body: {
      providerId: "google",
      userId: userId.toString(), // Better Auth API pričakuje string
    },
  });

  if (!accessToken) {
    throw new Error(`No Google access token found for user with ID: ${userId}`);
  }

  return accessToken;
}
