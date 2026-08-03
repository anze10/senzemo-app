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

export async function insertIntoDB(
  data: ProductionListWithoutId,
  orderId: number | null,
) {
  const existing = await prisma.productionList.findUnique({
    where: { DevEUI: data.DevEUI ?? undefined },
  });

  if (existing) {
    if (orderId && existing.orderId == null) {
      return await prisma.productionList.update({
        where: { DevEUI: data.DevEUI ?? undefined },
        data: { orderId: orderId },
      });
    }
    return existing;
  }

  return await prisma.productionList.create({
    data: {
      ...data,
      orderId: orderId ?? null,
    },
  });
}
