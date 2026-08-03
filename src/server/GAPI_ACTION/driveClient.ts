import { google } from "googleapis";

function getServiceAccountAuth() {
  const credentialsJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!credentialsJson) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY manjka v .env");
  }

  const credentials = JSON.parse(credentialsJson);

  return new google.auth.GoogleAuth({
    credentials,
    scopes: [
      "https://www.googleapis.com/auth/drive",
      "https://www.googleapis.com/auth/spreadsheets",
    ],
  });
}

const auth = getServiceAccountAuth();

export const drive = google.drive({ version: "v3", auth });
export const sheets = google.sheets({ version: "v4", auth });

// Shared Drive ID (NE navadna mapa) - datoteke ustvarjene tu štejejo
// proti organizacijski kvoti, ne proti Service Account kvoti (ki je 0)
export const DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID!;
