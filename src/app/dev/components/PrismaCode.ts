"use server";

import type { ProductionList } from "@prisma/client";
import { prisma } from "~/server/DATABASE_ACTION/prisma";

export interface ProductionList2 {
  DeviceType: string;
  DevEUI: string;
  AppEUI: string;
  AppKey: string;
  FrequencyRegion: string;
  SubBands: string;
  HWVersion: string;
  FWVersion: string;
  CustomFWVersion: string;
  SendPeriod: string;
  ACK: string;
  MovementThreshold: string;

  orderNumber: number;
}

export type ProductionListWithoutId = Omit<ProductionList, "id">;

export async function checkDevEUIUniqueness(devEUI: string): Promise<boolean> {
  try {
    const existing = await prisma.productionList.findUnique({
      where: { DevEUI: devEUI },
    });
    return !existing; // true if unique, false if exists
  } catch (error) {
    console.error("Error checking DevEUI uniqueness:", error);
    throw new Error("Failed to check DevEUI uniqueness");
  }
}

export async function InsertintoDB(data: ProductionListWithoutId) {
  // Check DevEUI uniqueness before inserting
  if (data.DevEUI) {
    const isUnique = await checkDevEUIUniqueness(data.DevEUI);
    if (!isUnique) {
      throw new Error(`DevEUI ${data.DevEUI} že obstaja v sistemu`);
    }
  }
  console.log("Inserting into DB:", data);
  return await prisma.productionList.create({ data });
}
