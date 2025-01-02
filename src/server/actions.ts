"use server";
import { useAuth } from "src/server/auth";
import { google } from "googleapis";

export async function create_spreatsheet() {
  const session = await useAuth();
  console.log({ access_token: session?.user.token });
  const client = new google.auth.OAuth2();

  client.setCredentials({
    access_token: session?.user.token,
  });

  if (!session?.user.token) throw new Error("No access token");

  const tokenInfo = await client.getTokenInfo(session.user.token);
  console.log(tokenInfo);

  const service = google.sheets({ version: "v4", auth: client });

  try {
    const spreadsheet = await service.spreadsheets
      .create({
        // resource,
        requestBody: {
          properties: {
            title: "New Spreadshit",
          },
        },
        fields: "spreadsheetId",
      })
      .then((response) => {
        console.log(response.data);
      });
  } catch (err) {
    // TODO (developer) - Handle exception
    console.error("Google spreadshit error");
    throw err;
  }
}
