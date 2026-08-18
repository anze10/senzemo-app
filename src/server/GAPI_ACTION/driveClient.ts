import { google } from "googleapis";

function getServiceAccountAuth() {
  let raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!raw) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY manjka v .env");
  }

  raw = raw.trim();

  // Nekateri .env parserji (predvsem na Windows) ne odstranijo obdajajočih
  // narekovajev tako zanesljivo kot na Linuxu - odstrani jih ročno, če so ostali.
  if (
    (raw.startsWith("'") && raw.endsWith("'")) ||
    (raw.startsWith('"') && raw.endsWith('"'))
  ) {
    raw = raw.slice(1, -1);
  }

  let credentials: Record<string, unknown>;
  try {
    credentials = JSON.parse(raw);
  } catch (err) {
    console.error(
      "[driveClient] JSON.parse napaka. Dolžina stringa:",
      raw.length,
      "Prvih 30 znakov:",
      raw.slice(0, 30),
    );
    throw err;
  }

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

export const DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID!;
