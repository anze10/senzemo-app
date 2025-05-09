"use server";

import { ProductionList } from "@prisma/client";
import { prisma } from "~/server/DATABASE_ACTION/prisma";
export type ProductionListWithoutId = Omit<ProductionList, "id">;

export async function InsertintoDB(data: ProductionListWithoutId) {
  return await prisma.productionList.create({ data });
}
