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

// export async function checkDevEUIUniqueness(devEUI: string): Promise<boolean> {

export async function InsertintoDB(data: ProductionListWithoutId) {
  const record = await prisma.productionList.upsert({
    where: { DevEUI: data.DevEUI ?? undefined },
    update: {},
    create: { ...data },
  });
  return record;
}
