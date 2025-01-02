// File: ~/server/auth.js

import { getCurrentSession } from "./session";



/**
 * Retrieves the current user session with authentication token.
 * @returns {Promise<{ user: { token: string } } | null>} The user session or null if no session.
 */
export async function useAuth() {
    try {
        const session = await getCurrentSession();
        return session;
    } catch (error) {
        console.error("Failed to retrieve user session:", error);
        return null;  // Depending on your error handling, you might want to throw an error instead
    }
}
