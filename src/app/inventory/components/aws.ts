"use server";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const b2Client = new S3Client({
  endpoint: process.env.AWS_ENDPOINT,
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: true,
});

// Sanitize S3 key components (critical for B2 compatibility)
const sanitizeKeyComponent = (input: string): string => {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
    .replace(/[^a-zA-Z0-9!\-_.*'()]/g, "_") // Replace invalid chars
    .replace(/_+/g, "_") // Collapse multiple underscores
    .replace(/^_|_$/g, ""); // Trim leading/trailing underscores
};

export const uploadPDFToB2 = async (
  file: File,
  invoiceNumber = "test",
  productName: string,
) => {
  // Sanitize inputs for S3 key
  const safeProductName = sanitizeKeyComponent(productName);
  const safeInvoiceNumber = sanitizeKeyComponent(invoiceNumber);

  const fileName = `${safeInvoiceNumber}-${Date.now()}.pdf`;
  const key = `invoices/${safeProductName}/${fileName}`;

  // Convert File to Buffer
  const fileBuffer = Buffer.from(await file.arrayBuffer());

  try {
    const command = new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME!,
      Key: key,
      Body: fileBuffer,
      ContentType: "application/pdf",
      ContentLength: fileBuffer.length,
    });

    await b2Client.send(command);
    return key; // Return the full storage path
  } catch (error) {
    console.error("Upload error:", {
      key,
      size: fileBuffer.length,
      error: (error as Error).message,
    });
    throw new Error(`Upload failed: ${(error as Error).message}`);
  }
};

// Simplified direct upload handler
export const uploadToB2 = async (file: File, invoiceNumber: string) => {
  return uploadPDFToB2(file, invoiceNumber, "invoices");
};

// Get sensor image URL from Backblaze bucket
export async function getSensorImageUrl(sensorName: string): Promise<string> {
  console.log("🔍 getSensorImageUrl called with sensorName:", sensorName);

  if (!sensorName) {
    console.log("❌ No sensor name provided");
    return "";
  }

  // Convert sensor name to lowercase and append .JPG (uppercase extension)
  const imageName = sensorName.toLowerCase() + ".JPG";
  const bucketName = "SENZEMO"; // Correct bucket name from working URL

  console.log("📁 Image name:", imageName);
  console.log("🪣 Bucket name:", bucketName);

  // Construct the public URL for Backblaze B2
  // Format from working URL: https://f003.backblazeb2.com/file/SENZEMO/images/smc30.JPG
  const baseUrl =
    process.env.NEXT_PUBLIC_B2_DOWNLOAD_URL ||
    `https://f003.backblazeb2.com/file/${bucketName}`;

  const fullUrl = `${baseUrl}/images/${imageName}`;

  console.log("🌐 Base URL:", baseUrl);
  console.log("🔗 Full image URL:", fullUrl);
  console.log(
    "🏗️ Environment variable NEXT_PUBLIC_B2_DOWNLOAD_URL:",
    process.env.NEXT_PUBLIC_B2_DOWNLOAD_URL,
  );

  return fullUrl;
}

// Check if sensor image exists (client-side helper)
export const checkSensorImageExists = async (
  imageUrl: string,
): Promise<boolean> => {
  try {
    const response = await fetch(imageUrl, { method: "HEAD" });
    return response.ok;
  } catch {
    return false;
  }
};
