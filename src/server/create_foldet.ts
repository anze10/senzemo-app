"use server";
import { auth } from "~/server/auth";
import { type Auth, google } from "googleapis";
import * as stream from "stream";

// Funkcija za ustvarjanje mape
async function createFolder(
  client: Auth.OAuth2Client,
  customer_name: string,
  order_number: string,
) {

  const service = google.drive({ version: "v3", auth: client });
  const fileMetadata = {
    name: customer_name + "   " + order_number,
    mimeType: "application/vnd.google-apps.folder",
  };
  try {
    const file = await service.files.create({
      requestBody: fileMetadata,
      fields: "id",
    });
    console.log("Folder Id:", file.data.id);
    return file.data.id;
  } catch (err) {
    console.log(err);
    throw err;
  }
}

// Funkcija za ustvarjanje preglednice znotraj določene mape
async function createSpreadsheet(
  client: Auth.OAuth2Client,
  folderId: string | null | undefined,
  customer_name: string,
  order_number: string,
  currentTime: Date,
  name: string,
) {

  const service = google.drive({ version: "v3", auth: client });

  const sheets = google.sheets({ version: "v4", auth: client });

  const fileMetadata = {
    name: "Order " + order_number + "-" + "Device list",
    parents: folderId ? [folderId] : undefined,
    mimeType: "application/vnd.google-apps.spreadsheet",
  };

  try {
    const file = await service.files.create({
      requestBody: fileMetadata,
      media: {},
      fields: "id",
    });
    console.log("Spreadsheet Id:", file.data.id);

    const spreadsheetId = file.data.id;
    const time = currentTime.toISOString().split("T")[0];

    const data = [
      { range: "A3", values: [["Customer Name:"]] },
      { range: "B3", values: [[customer_name]] },
      { range: "A4", values: [["Order No:"]] },
      { range: "B4", values: [[order_number]] },
      { range: "A5", values: [["Date of production:"]] },
      { range: "B5", values: [[time]] },
      { range: "A7", values: [["Fulfilled by:"]] },
      { range: "B7", values: [[name]] },
      { range: "A9", values: [["Device Type"]] },
      { range: "B9", values: [["DevEUI"]] },
      { range: "C9", values: [["AppEUI"]] },
      { range: "D9", values: [["AppKey"]] },
      { range: "E9", values: [["Frequency Region"]] },
      { range: "F9", values: [["Sub Bands"]] },
      { range: "G9", values: [["HW Version"]] },
      { range: "H9", values: [["FW Version"]] },
      { range: "I9", values: [["Custom FW Version"]] },
      { range: "J9", values: [["Send Period"]] },
      { range: "K9", values: [["ACK"]] },
      { range: "L9", values: [["Movement Threshold"]] },
    ];

    const requests = data.map((item) => ({
      range: item.range,
      values: item.values,
    }));

    // Insert data into the spreadsheet
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: spreadsheetId !== null ? spreadsheetId : undefined,
      requestBody: {
        valueInputOption: "USER_ENTERED",
        data: requests,
      },
    });

    // Bold formatting for specific cells without background color and right alignment
    const boldRightAlignRequests = ["B3", "B4", "B5", "B7"].map((cell) => ({
      repeatCell: {
        range: {
          sheetId: 0,
          startRowIndex: parseInt(cell.substring(1)) - 1,
          endRowIndex: parseInt(cell.substring(1)),
          startColumnIndex: cell.charCodeAt(0) - 65,
          endColumnIndex: cell.charCodeAt(0) - 64,
        },
        cell: {
          userEnteredFormat: {
            textFormat: {
              bold: true,
            },
            horizontalAlignment: "RIGHT", // Right-align text
          },
        },
        fields: "userEnteredFormat(textFormat,horizontalAlignment)",
      },
    }));
    // const overlapcel = {
    //   updateCells: {
    //     range: {
    //       sheetId: 0, // Assuming this is the first sheet, update the sheetId if necessary
    //       startRowIndex: 2, // B3 is row 3 (0-based index)
    //       endRowIndex: 3,   // End at the next row
    //       startColumnIndex: 1, // B is the 2nd column (0-based index)
    //       endColumnIndex: 2,   // End at the next column
    //     },
    //     rows: [
    //       {
    //         values: [
    //           {
    //             userEnteredFormat: {
    //               wrapStrategy: "CLIP", // This will make the text overflow (clip instead of wrap)
    //             },
    //           },
    //         ],
    //       },
    //     ],
    //     fields: "userEnteredFormat.wrapStrategy",
    //   },
    // };

    // Bold, background color, and alignment formatting for header row A9:L9
    const headerFormattingRequest = {
      repeatCell: {
        range: {
          sheetId: 0,
          startRowIndex: 8, // Row 9 in zero-indexed
          endRowIndex: 9,
          startColumnIndex: 0, // Column A in zero-indexed
          endColumnIndex: 12, // Column L in zero-indexed
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: {
              red: 0.9,
              green: 0.9,
              blue: 0.9,
            },
            horizontalAlignment: "CENTER", // Center-align horizontally
            verticalAlignment: "MIDDLE", // Center-align vertically
            textFormat: {
              bold: true,
            },
            borders: {
              top: {
                style: "SOLID",
                color: { red: 0.5, green: 0.5, blue: 0.5 },
              },
              bottom: {
                style: "SOLID",
                color: { red: 0.5, green: 0.5, blue: 0.5 },
              },
              left: {
                style: "SOLID",
                color: { red: 0.5, green: 0.5, blue: 0.5 },
              },
              right: {
                style: "SOLID",
                color: { red: 0.5, green: 0.5, blue: 0.5 },
              },
            },
          },
        },
        fields:
          "userEnteredFormat(backgroundColor,borders,textFormat,horizontalAlignment,verticalAlignment)",
      },
    };

    // Manually resize columns to fit content
    const resizeColumnsRequests = {
      updateDimensionProperties: {
        range: {
          sheetId: 0,
          dimension: "COLUMNS",
          startIndex: 0, // Start at column A
          endIndex: 12, // End at column L
        },
        properties: {
          pixelSize: 150, // Set a specific pixel width for each column
        },
        fields: "pixelSize",
      },
    };

    // Insert image into cells A1, A2, B1, B2
    const mergeCellsRequest = {
      mergeCells: {
        range: {
          sheetId: 0,
          startRowIndex: 0,
          endRowIndex: 2,
          startColumnIndex: 0,
          endColumnIndex: 2,
        },
        mergeType: "MERGE_ALL",
      },
    };
    const imageAlignmentRequest = {
      repeatCell: {
        range: {
          sheetId: 0,
          startRowIndex: 0, // Start at row 0 (A1)
          endRowIndex: 2, // End at row 2 (B2)
          startColumnIndex: 0, // Start at column A
          endColumnIndex: 2, // End at column B
        },
        cell: {
          userEnteredFormat: {
            horizontalAlignment: "CENTER",
            verticalAlignment: "MIDDLE",
          },
        },
        fields: "userEnteredFormat(horizontalAlignment,verticalAlignment)",
      },
    };
    // Insert image into merged cells A1:B2
    const imageRequests = {
      updateCells: {
        range: {
          sheetId: 0,
          startRowIndex: 0, // A1 starts at row 0
          endRowIndex: 2, // B2 ends at row 2 (zero-indexed)
          startColumnIndex: 0, // Column A
          endColumnIndex: 2, // Column B
        },
        rows: [
          {
            values: [
              {
                userEnteredValue: {
                  formulaValue: `=IMAGE("https://drive.google.com/uc?id=1t4IRwHIhj4XrNlH7fNiwL4nycX8uFYse";4;30;250)`,
                },
              },
            ],
          },
        ],

        fields: "userEnteredValue",
      },
    };

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: spreadsheetId !== null ? spreadsheetId : undefined,
      requestBody: {
        requests: [
          ...boldRightAlignRequests,
          // overlapcel,
          headerFormattingRequest,
          resizeColumnsRequests,
          mergeCellsRequest,
          imageAlignmentRequest,
          imageRequests,
        ],
      },
    });

    return spreadsheetId;
  } catch (err) {
    console.error("Google spreadsheet error", err);
    throw err;
  }
}
async function insertIntoSpreadsheet(
  client: Auth.OAuth2Client,
  spreadsheetId: string,
  newRow: string[],
): Promise<void> {

  const sheets = google.sheets({ version: "v4", auth: client });

  try {
    // Fetch current data from the spreadsheet to determine the next empty row
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: spreadsheetId,
      range: "A9:A", // Check starting from row 8
    });

    const rows = response.data.values ?? [];
    const nextRow = rows.length + 9; // Calculate the next available row

    const data = [
      {
        range: `A${nextRow}`,
        values: [newRow],
      },
    ];

    // Insert new row into the spreadsheet
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: spreadsheetId,
      requestBody: {
        valueInputOption: "USER_ENTERED",
        data: data,
      },
    });

    console.log(`Inserted new row at row ${nextRow}`);

    // Resize columns (handled in a separate call)
    const resizeColumnsRequests = {
      updateDimensionProperties: {
        range: {
          sheetId: 0,
          dimension: "COLUMNS",
          startIndex: 0, // Start at column A
          endIndex: 12, // End at column L
        },
        properties: {
          pixelSize: 150, // Set a specific pixel width for each column
        },
        fields: "pixelSize",
      },
    };
    const AlignmentRequest = {
      repeatCell: {
        range: {
          sheetId: 0,
          startRowIndex: 9, // Start at row 0 (A1)
          endRowIndex: nextRow, // End at row 2 (B2)
          startColumnIndex: 0, // Start at column A
          endColumnIndex: 12, // End at column B
        },
        cell: {
          userEnteredFormat: {
            horizontalAlignment: "CENTER",
            verticalAlignment: "MIDDLE",
          },
        },
        fields: "userEnteredFormat(horizontalAlignment,verticalAlignment)",
      },
    };

    // Perform the column resizing operation
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: spreadsheetId,
      requestBody: {
        requests: [resizeColumnsRequests, AlignmentRequest],
      },
    });
  } catch (error) {
    console.error("Error inserting new row into the spreadsheet:", error);
    throw error;
  }
}

async function createSpreadsheetCsv(
  client: Auth.OAuth2Client,
  folderId: string | null | undefined,
  order_number: string,
) {

  const service = google.drive({ version: "v3", auth: client });
  const fileMetadata = {
    name: "Order " + order_number + "-" + "TTN import" + ".csv",
    parents: folderId ? [folderId] : undefined,

    mimeType: "text/csv",
  };

  const media = {
    mimeType: "text/csv",
    body: "id,dev_eui,join_eui,name,frequency_plan_id,lorawan_version,lorawan_phy_version,app_key,brand_id,model_id,hardware_version,firmware_version,band_id\n", // Initial CSV content (headers)
  };

  try {
    const file = await service.files.create({
      requestBody: fileMetadata,
      media: media, // Include this if you want to add initial content
      fields: "id",
    });
    console.log("Spreadsheet Id:", file.data.id);
    return file.data.id;
  } catch (err) {
    console.error("Google spreadsheet error:", err);
    throw err;
  }
}

async function insertIntoCsvFile(
  client: Auth.OAuth2Client,
  fileId: string,
  newRow: string[],
): Promise<void> {

  const drive = google.drive({ version: "v3", auth: client });

  try {
    const newRowString = newRow.join(",") + "\n";

    const response = await drive.files.get(
      {
        fileId: fileId,
        alt: "media",
      },
      { responseType: "stream" },
    );

    let existingCsvContent = "";
    response.data.on("data", (chunk) => {
      existingCsvContent += chunk;
    });

    await new Promise<void>((resolve, reject) => {
      response.data.on("end", resolve);
      response.data.on("error", reject);
    });
    const updatedCsvContent = existingCsvContent + newRowString;

    const media = {
      mimeType: "text/csv",
      body: stream.Readable.from(updatedCsvContent),
    };

    await drive.files.update({
      fileId: fileId,
      media: media,
    });

    console.log("File successfully updated with new data.");
  } catch (error) {
    console.error("Error during the update:", error);
    throw error;
  }
}
// Glavna funkcija za izvajanje zgornjih korakov
export async function createFolderAndSpreadsheet(
  customer_name: string,
  order_number: string,
) {
  const session = await auth();
  const currentTime = new Date();
  //   console.log({ access_token: session?.user.token });

  // const google_client = new google.auth.OAuth2();
  const client = new google.auth.OAuth2() as unknown as Auth.OAuth2Client;

  client.setCredentials({
    access_token: session?.user.token,
  });

  if (!session?.user.token) throw new Error("No access token found");
  const name = session?.user.name;

  try {
    // Ustvarimo mapo
    const folderId = await createFolder(client, customer_name, order_number);

    // Ustvarimo preglednico znotraj te mape
    const spreadsheetId = await createSpreadsheet(
      client,
      folderId,
      customer_name,
      order_number,
      currentTime,
      name ?? "Neznano",
    );

    const fileId = await createSpreadsheetCsv(client, folderId, order_number);

    if (!folderId || !spreadsheetId || !fileId) {
      throw new Error("Error creating folder, spreadsheet or csv file");
    }

    return { folderId, spreadsheetId, fileId };
  } catch (err) {
    console.error(err);
    throw err;
  }
}

export async function insert(
  fileId: string,
  newRow: string[],
  spreadsheetId: string,
  nerEXE: string[],
) {
  const session = await auth();
  console.log({ access_token: session?.user.token });
  const client = new google.auth.OAuth2() as unknown as Auth.OAuth2Client;

  client.setCredentials({
    access_token: session?.user.token,
  });

  if (!session?.user.token) throw new Error("No access token");

  const tokenInfo = await client.getTokenInfo(session?.user.token);
  console.log(tokenInfo);

  try {
    await insertIntoCsvFile(client, fileId, newRow);
    await insertIntoSpreadsheet(client, spreadsheetId, nerEXE);
  } catch (err) {
    console.error(err);
    throw err;
  }
}

