"use server";

import * as stream from "stream";
import { drive, DRIVE_FOLDER_ID, sheets } from "./driveClient";
import { getCurrentSession } from "src/server/LOGIN_LUCIA_ACTION/session";
import { prisma } from "~/server/DATABASE_ACTION/prisma";

// Funkcija za ustvarjanje mape - zdaj VEDNO znotraj skupne DRIVE_FOLDER_ID mape,
// ker Service Account nima lastnega "osebnega" Drive prostora
async function createFolder(
  customer_name: string | null,
  order_number: string | null,
) {
  const folderName =
    customer_name && order_number
      ? `${customer_name}   ${order_number}`
      : `Stock Inventory ${new Date().toISOString().split("T")[0]}`;

  const fileMetadata = {
    name: folderName,
    mimeType: "application/vnd.google-apps.folder",
    parents: [DRIVE_FOLDER_ID],
  };
  try {
    const file = await drive.files.create({
      requestBody: fileMetadata,
      fields: "id",
      supportsAllDrives: true,
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
  folderId: string | null | undefined,
  customer_name: string | null,
  order_number: string | null,
  currentTime: Date,
  name: string,
) {
  const spreadsheetName =
    customer_name && order_number
      ? `Order ${order_number}-Device list`
      : `Stock Inventory-Device list ${currentTime.toISOString().split("T")[0]}`;

  const fileMetadata = {
    name: spreadsheetName,
    parents: folderId ? [folderId] : [DRIVE_FOLDER_ID],
    mimeType: "application/vnd.google-apps.spreadsheet",
  };

  try {
    const file = await drive.files.create({
      requestBody: fileMetadata,
      media: {},
      fields: "id",
      supportsAllDrives: true,
    });
    console.log("Spreadsheet Id:", file.data.id);

    const spreadsheetId = file.data.id;
    const time = currentTime.toISOString().split("T")[0];

    const data = [
      { range: "A3", values: [["Customer Name:"]] },
      { range: "B3", values: [[customer_name ?? "Stock Inventory"]] },
      { range: "A4", values: [["Order No:"]] },
      { range: "B4", values: [[order_number ?? "N/A"]] },
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

    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: spreadsheetId !== null ? spreadsheetId : undefined,
      requestBody: {
        valueInputOption: "USER_ENTERED",
        data: requests,
      },
    });

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
            horizontalAlignment: "RIGHT",
          },
        },
        fields: "userEnteredFormat(textFormat,horizontalAlignment)",
      },
    }));

    const headerFormattingRequest = {
      repeatCell: {
        range: {
          sheetId: 0,
          startRowIndex: 8,
          endRowIndex: 9,
          startColumnIndex: 0,
          endColumnIndex: 12,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: {
              red: 0.9,
              green: 0.9,
              blue: 0.9,
            },
            horizontalAlignment: "CENTER",
            verticalAlignment: "MIDDLE",
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

    const resizeColumnsRequests = {
      updateDimensionProperties: {
        range: {
          sheetId: 0,
          dimension: "COLUMNS",
          startIndex: 0,
          endIndex: 12,
        },
        properties: {
          pixelSize: 150,
        },
        fields: "pixelSize",
      },
    };

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
          startRowIndex: 0,
          endRowIndex: 2,
          startColumnIndex: 0,
          endColumnIndex: 2,
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
    const imageRequests = {
      updateCells: {
        range: {
          sheetId: 0,
          startRowIndex: 0,
          endRowIndex: 2,
          startColumnIndex: 0,
          endColumnIndex: 2,
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
  spreadsheetId: string,
  newRow: string[],
): Promise<void> {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: spreadsheetId,
      range: "A9:A",
    });

    const rows = response.data.values ?? [];
    const nextRow = rows.length + 9;

    const data = [
      {
        range: `A${nextRow}`,
        values: [newRow],
      },
    ];

    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: spreadsheetId,
      requestBody: {
        valueInputOption: "USER_ENTERED",
        data: data,
      },
    });

    console.log(`Inserted new row at row ${nextRow}`);

    const resizeColumnsRequests = {
      updateDimensionProperties: {
        range: {
          sheetId: 0,
          dimension: "COLUMNS",
          startIndex: 0,
          endIndex: 12,
        },
        properties: {
          pixelSize: 150,
        },
        fields: "pixelSize",
      },
    };
    const AlignmentRequest = {
      repeatCell: {
        range: {
          sheetId: 0,
          startRowIndex: 9,
          endRowIndex: nextRow,
          startColumnIndex: 0,
          endColumnIndex: 12,
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
  folderId: string | null | undefined,
  order_number: string | null,
) {
  const csvName = order_number
    ? `Order ${order_number}-TTN import.csv`
    : `Stock Inventory-TTN import ${new Date().toISOString().split("T")[0]}.csv`;

  const fileMetadata = {
    name: csvName,
    parents: folderId ? [folderId] : [DRIVE_FOLDER_ID],
    mimeType: "text/csv",
  };

  const media = {
    mimeType: "text/csv",
    body: "id,dev_eui,join_eui,name,frequency_plan_id,lorawan_version,lorawan_phy_version,app_key,brand_id,model_id,hardware_version,firmware_version,band_id\n",
  };

  try {
    const file = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: "id",
      supportsAllDrives: true,
    });
    console.log("Spreadsheet Id:", file.data.id);
    return file.data.id;
  } catch (err) {
    console.error("Google spreadsheet error:", err);
    throw err;
  }
}

async function insertIntoCsvFile(
  fileId: string,
  newRow: string[],
): Promise<void> {
  try {
    const newRowString = newRow.join(",") + "\n";

    const response = await drive.files.get(
      {
        fileId: fileId,
        alt: "media",
        supportsAllDrives: true,
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
      supportsAllDrives: true,
    });

    console.log("File successfully updated with new data.");
  } catch (error) {
    console.error("Error during the update:", error);
    throw error;
  }
}

// Glavna funkcija - zdaj brez per-user OAuth tokena, uporablja skupen
// Service Account. `getCurrentSession()` obdržimo SAMO za pridobitev
// imena uporabnika (za "Fulfilled by" polje), ne za avtentikacijo proti Google-u.
export async function createFolderAndSpreadsheet(
  customer_name: string | null,
  order_number: string | null,
) {
  const session = await getCurrentSession();
  const currentTime = new Date();
  const name = session?.user?.name ?? "Neznano";

  try {
    const folderId = await createFolder(customer_name, order_number);

    const spreadsheetId = await createSpreadsheet(
      folderId,
      customer_name,
      order_number,
      currentTime,
      name,
    );

    const fileId = await createSpreadsheetCsv(folderId, order_number);

    if (!folderId || !spreadsheetId || !fileId) {
      throw new Error("Error creating folder, spreadsheet or csv file");
    }

    return { folderId, spreadsheetId, fileId };
  } catch (err) {
    console.error(err);
    throw err;
  }
}

export async function createFolderAndSpreadsheetWithData(
  customer_name: string | null,
  order_number: string | null,
  devices: Array<{
    id: number;
    devEUI: string | null;
    deviceType: string | null;
    frequency: string | null;
  }>,
) {
  try {
    const { folderId, spreadsheetId, fileId } =
      await createFolderAndSpreadsheet(customer_name, order_number);

    for (const device of devices) {
      if (device.devEUI && device.deviceType) {
        const sensorData = await prisma.productionList.findUnique({
          where: { DevEUI: device.devEUI },
          include: {
            order: {
              select: {
                customerName: true,
                orderName: true,
              },
            },
          },
        });

        if (!sensorData) {
          console.warn(`Sensor data not found for DevEUI: ${device.devEUI}`);
          continue;
        }

        const devEUI = validateAndFormatEUI(sensorData.DevEUI, "dev");
        const deviceId = `device-${devEUI.toLowerCase()}`;
        const appEUI = validateAndFormatEUI(
          sensorData.AppEUI || generateJoinEUI(devEUI),
          "join",
        );
        const appKey = validateAndFormatAppKey(
          sensorData.AppKey || generateAppKey(devEUI),
        );
        const deviceType = sensorData.DeviceType || "";
        const frequencyRegion = sensorData.FrequencyRegion || "";
        const subBands = sensorData.SubBands || "";
        const hwVersion = sensorData.HWVersion || "1.0";
        const fwVersion = sensorData.FWVersion || "1.0";
        const customFWVersion = sensorData.CustomFWVersion || "";
        const sendPeriod = sensorData.SendPeriod || "900";
        const ack = sensorData.ACK || "false";
        const movementThreshold = sensorData.MovementThreshold || "10";

        const frequencyPlan = mapFrequencyToTTNFormat(frequencyRegion);
        const sanitizedModelId = sanitizeModelId(deviceType);
        const sanitizedBrandId = sanitizeBrandId("senzemo");
        const deviceName = `${sanitizedModelId}-${devEUI}`;
        const ttnFirmwareVersion = "";

        const csvRow = [
          deviceId,
          devEUI,
          appEUI,
          deviceName,
          frequencyPlan,
          "1.0.3",
          "1.0.3-a",
          appKey,
          sanitizedBrandId,
          sanitizedModelId,
          hwVersion,
          ttnFirmwareVersion,
          frequencyPlan,
        ];

        const spreadsheetRow = [
          deviceType,
          devEUI,
          appEUI,
          appKey,
          frequencyRegion,
          subBands,
          hwVersion,
          fwVersion,
          customFWVersion,
          sendPeriod,
          ack,
          movementThreshold,
        ];

        await insert(fileId, csvRow, spreadsheetId, spreadsheetRow);
      }
    }

    return { folderId, spreadsheetId, fileId };
  } catch (err) {
    console.error("Error creating documents with data:", err);
    throw err;
  }
}

function generateJoinEUI(devEUI: string): string {
  if (!devEUI) return "70B3D57ED0000000";
  const hash = devEUI.split("").reduce((a, b) => {
    a = (a << 5) - a + b.charCodeAt(0);
    return a & a;
  }, 0);
  const hashedSuffix = Math.abs(hash)
    .toString(16)
    .padStart(8, "0")
    .toUpperCase();
  return `70B3D57E${hashedSuffix}`;
}

function generateAppKey(devEUI: string): string {
  const hash = devEUI.split("").reduce((a, b) => {
    a = (a << 5) - a + b.charCodeAt(0);
    return a & a;
  }, 0);
  return Math.abs(hash).toString(16).padStart(32, "0").toUpperCase();
}

function mapFrequencyToTTNFormat(frequency: string | null): string {
  if (!frequency) return "EU_863_870";
  switch (frequency) {
    case "EU868":
      return "EU_863_870";
    case "US915":
      return "US_902_928";
    case "AS923":
      return "AS_923";
    case "EU433":
      return "EU_433";
    case "ISM2400":
    case "2.4 GHz":
      return "ISM_2400";
    default:
      return "EU_863_870";
  }
}

function sanitizeModelId(deviceType: string | null): string {
  if (!deviceType) return "senzemo-device";
  let modelId = deviceType
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (modelId.length === 0 || !/^[a-z0-9]/.test(modelId)) {
    modelId = "senzemo-" + modelId;
  }
  if (modelId.length < 3) {
    modelId = modelId + "-dev";
  }
  if (modelId.endsWith("-")) {
    modelId = modelId.slice(0, -1);
  }
  return modelId;
}

function sanitizeBrandId(brandName: string): string {
  let brandId = brandName
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (brandId.length === 0 || !/^[a-z0-9]/.test(brandId)) {
    brandId = "senzemo";
  }
  if (brandId.length < 3) {
    brandId = "senzemo";
  }
  if (brandId.endsWith("-")) {
    brandId = brandId.slice(0, -1);
  }
  return brandId;
}

function validateAndFormatEUI(
  eui: string | null,
  type: "dev" | "join",
): string {
  if (!eui) {
    return type === "dev" ? "0000000000000000" : "70B3D57ED0000000";
  }
  const cleanEUI = eui.replace(/[^a-fA-F0-9]/g, "").toUpperCase();
  if (cleanEUI.length === 16) {
    return cleanEUI;
  } else if (cleanEUI.length < 16) {
    return cleanEUI.padStart(16, "0");
  } else {
    return cleanEUI.substring(0, 16);
  }
}

function validateAndFormatAppKey(appKey: string | null): string {
  if (!appKey) {
    return "00000000000000000000000000000000";
  }
  const cleanKey = appKey.replace(/[^a-fA-F0-9]/g, "").toUpperCase();
  if (cleanKey.length === 32) {
    return cleanKey;
  } else if (cleanKey.length < 32) {
    return cleanKey.padStart(32, "0");
  } else {
    return cleanKey.substring(0, 32);
  }
}

// Zdaj brez per-user tokena - Service Account je skupen za vse klice
export async function insert(
  fileId: string,
  newRow: string[],
  spreadsheetId: string,
  nerEXE: string[],
) {
  console.log("Inserting new row into the spreadsheet...");
  try {
    await insertIntoCsvFile(fileId, newRow);
    await insertIntoSpreadsheet(spreadsheetId, nerEXE);
  } catch (err) {
    console.error(err);
    throw err;
  }
}
