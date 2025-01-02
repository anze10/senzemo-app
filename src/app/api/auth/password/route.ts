'use server';
import { NextApiRequest, NextApiResponse } from 'next';
import { handleGoogleCallback } from 'src/server/auth_due.actions'; // Adjust the path as necessary

export async function GET(req: NextApiRequest, res: NextApiResponse) {
    console.log("Incoming Google callback request:", req.url);
    console.log("Query parameters:", req.query);

    const { code, state } = req.query;

    if (!code || !state) {
        return res.status(400).send("Request missing code or state.");
    }
    console.log("Code:", code);
    try {
        const result = await handleGoogleCallback(code as string, state as string);
        console.log("Google callback result:", result);
        // Redirect or respond depending on your application's needs
        res.redirect('podstran'); // Redirect to a dashboard or another suitable page
    } catch (error) {
        console.error("Failed to handle Google callback:", error);
        res.status(500).send("Failed to authenticate with Google.");
    }
}

// export function POST(req: NextApiRequest, res: NextApiResponse) {
//     res.status(405).send("Method Not Allowed");
// }


