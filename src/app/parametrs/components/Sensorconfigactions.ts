"use server";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { b2Client } from "src/app/inventory/components/B2client";
import type { ParsedSensorData } from "~/app/dev/components/Reader/ParseSensorData";

const CONFIGS_BUCKET = process.env.B2_CONFIGS_BUCKET_NAME!;

interface SensorConfig {
  familyId: number;
  productId: number;
  name: string;
  values: ParsedSensorData;
  createdAt: string;
}

// KLJUČNO: pot zdaj vsebuje OBA identifikatorja - kombinacija (familyId, productId)
// je edina prava unikatna identiteta konkretnega senzorja, ne posamezen ID sam.
function configKey(familyId: number, productId: number, name: string): string {
  const safeName = name.trim().replace(/[^a-zA-Z0-9-_]/g, "_");
  return `configs/${familyId}_${productId}/${safeName}.json`;
}

function configPrefix(familyId: number, productId: number): string {
  return `configs/${familyId}_${productId}/`;
}

export async function listConfigsForFamily(
  familyId: number,
  productId: number,
): Promise<string[]> {
  const result = await b2Client.send(
    new ListObjectsV2Command({
      Bucket: CONFIGS_BUCKET,
      Prefix: configPrefix(familyId, productId),
    }),
  );

  return (result.Contents ?? [])
    .map((obj) => obj.Key ?? "")
    .filter(Boolean)
    .map((key) => {
      const fileName = key.split("/").pop() ?? "";
      return fileName.replace(/\.json$/, "");
    });
}

export async function getConfig(
  familyId: number,
  productId: number,
  name: string,
): Promise<SensorConfig | null> {
  try {
    const result = await b2Client.send(
      new GetObjectCommand({
        Bucket: CONFIGS_BUCKET,
        Key: configKey(familyId, productId, name),
      }),
    );

    const body = await result.Body?.transformToString();
    if (!body) return null;

    return JSON.parse(body) as SensorConfig;
  } catch (err) {
    console.error("Napaka pri branju configa:", err);
    return null;
  }
}

export async function saveConfig(
  familyId: number,
  productId: number,
  name: string,
  values: ParsedSensorData,
): Promise<void> {
  if (!name.trim()) {
    throw new Error("Ime configa ne sme biti prazno.");
  }

  const config: SensorConfig = {
    familyId,
    productId,
    name: name.trim(),
    values,
    createdAt: new Date().toISOString(),
  };

  await b2Client.send(
    new PutObjectCommand({
      Bucket: CONFIGS_BUCKET,
      Key: configKey(familyId, productId, name),
      Body: JSON.stringify(config, null, 2),
      ContentType: "application/json",
    }),
  );
}

export async function deleteConfig(
  familyId: number,
  productId: number,
  name: string,
): Promise<void> {
  await b2Client.send(
    new DeleteObjectCommand({
      Bucket: CONFIGS_BUCKET,
      Key: configKey(familyId, productId, name),
    }),
  );
}
