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
    // Senzor je bil že prej skeniran - posodobi VSE podatke na najnovejše
    // vrednosti (ne samo orderId), ker je uporabnik lahko ponovno programiral
    // senzor z drugačnimi nastavitvami od prvega skeniranja
    return await prisma.productionList.update({
      where: { DevEUI: data.DevEUI ?? undefined },
      data: {
        ...data,
        // orderId posodobi SAMO če ga senzor še nima (ne prepiši
        // obstoječega naročila z null, če je nov klic brez orderId)
        orderId: orderId ?? existing.orderId,
      },
    });
  }

  return await prisma.productionList.create({
    data: {
      ...data,
      orderId: orderId ?? null,
    },
  });
}

export async function checkDevEuiExists(devEui: string): Promise<boolean> {
  const existing = await prisma.productionList.findFirst({
    where: { DevEUI: devEui },
    select: { id: true },
  });
  return existing !== null;
}
