/* eslint-disable @typescript-eslint/no-unused-vars */
// pages/api/createSpreadsheet.js

//import { lucia } from "src/server/lucia"; 
import { validateSessionToken } from "src/server/validate_session";
import { google } from "googleapis";

import { NextApiRequest, NextApiResponse } from 'next';

export default async function createSpreadsheet(req: NextApiRequest, res: NextApiResponse) {
  // Retrieve the JWT token from cookies (assuming it's stored in cookies)
  const token = req.cookies['lucia_auth_token'];

  if (!token) {
    res.status(401).json({ error: "No access token provided" });
    return;
  }

  // Verify the JWT token using Lucia
  let user;
  try {
    user = await validateSessionToken(token);
  } catch (error) {
    if (error instanceof Error) {
      res.status(401).json({ error: "Authentication failed: " + error.message });
    } else {
      res.status(401).json({ error: "Authentication failed" });
    }
    return;
  }

  // Setup Google OAuth client
  const client = new google.auth.OAuth2();

  // Set credentials using the token directly (if it’s a JWT suitable for Google)
  client.setCredentials({
    access_token: token,
  });

  // Initialize Google Sheets API
  const service = google.sheets({ version: "v4", auth: client });

  try {
    // Create a new spreadsheet
    const response = await service.spreadsheets.create({
      requestBody: {
        properties: {
          title: "New Spreadsheet",
        },
      },
      fields: "spreadsheetId",
    });

    res.status(200).json(response.data);  // Send back the spreadsheet details
  } catch (err) {
    console.error("Error creating Google Spreadsheet", err);
    res.status(500).json({ error: "Google Spreadsheet creation failed" });
  }
}
