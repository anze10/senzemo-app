"use server";

import { prisma } from "~/server/DATABASE_ACTION/prisma";
import type { Senzor } from "@prisma/client";

export async function UpdateorAddSenor(params: Senzor) {
  const updateData = {
    sensorName: params.sensorName,
    familyId: params.familyId,
    productId: params.productId,
    photograph: params.photograph,
    payloadDecoder: params.payloadDecoder,
    description: params.description,
    zpl: params.zpl,
    frequency: params.frequency,
    ...(params.decoder !== null && { decoder: params.decoder }),
  };

  return prisma.senzor.upsert({
    where: { id: params.id },
    update: updateData,
    create: updateData,
  });
}

export async function InsertSensor(params: Omit<Senzor, "id">) {
  console.log("Decoder type:", typeof params.decoder);
  console.log("Decoder value:", params.decoder);

  const createData = {
    sensorName: params.sensorName,
    familyId: params.familyId,
    productId: params.productId,
    photograph: params.photograph,
    payloadDecoder: params.payloadDecoder,
    description: params.description,
    zpl: params.zpl,
    frequency: params.frequency,
    ...(params.decoder !== null && { decoder: params.decoder }),
  };

  return prisma.senzor.create({
    data: createData,
  });
}

export async function DeleteSensor(id: number) {
  return prisma.senzor.delete({
    where: { id },
  });
}

export async function GetSensors() {
  return prisma.senzor.findMany();
}
