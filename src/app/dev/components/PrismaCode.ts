"use server";

import { ProductionList } from "@prisma/client";
import { prisma } from "~/server/DATABASE_ACTION/prisma";

// export interface ProductionList2 {
//   DeviceType: string;
//   DevEUI: string;
//   AppEUI: string;
//   AppKey: string;
//   FrequencyRegion: string;
//   SubBands: string;
//   HWVersion: string;
//   FWVersion: string;
//   CustomFWVersion: string;
//   SendPeriod: string;
//   ACK: string;
//   MovementThreshold: string;

//   orderNumber: number;
// }

export type ProductionListWithoutId = Omit<ProductionList, "id">;

export async function InsertintoDB(data: ProductionListWithoutId) {
  return await prisma.productionList.create({ data });
}
