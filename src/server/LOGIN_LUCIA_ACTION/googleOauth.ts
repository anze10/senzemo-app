// src/server/google/googleOauth.ts
import { Google } from "arctic";

const clientId = process.env.GOOGLE_CLIENT_ID!;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
const redirectURI = process.env.GOOGLE_REDIRECT_URI!;
// npr. "http://localhost:3000/api/auth/callback/google" (isti kot ga uporablja Better Auth)

export const google = new Google(clientId, clientSecret, redirectURI);
