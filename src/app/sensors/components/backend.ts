'use server';

import { prisma } from "~/server/DATABASE_ACTION/prisma";

import { Senzor } from "@prisma/client";
import { JsonValue } from "@prisma/client/runtime/library";

export async function UpdateorAddSenor(params: Senzor) {
    return prisma.senzor.upsert({
        where: { id: params.id },
        update: {
            sensorName: params.sensorName,
            familyId: params.familyId,
            productId: params.productId,
            photograph: params.photograph,
            payloadDecoder: params.payloadDecoder,
            description: params.description,
            decoder: params.decoder ? params.decoder : undefined,
        },
        create: {
            sensorName: params.sensorName,
            familyId: params.familyId,
            productId: params.productId,
            photograph: params.photograph,
            payloadDecoder: params.payloadDecoder,
            description: params.description,
            decoder: params.decoder ? params.decoder : undefined,
        },
    });
}

export async function InsertSensor(params: Omit<Senzor, 'id'>) {
    console.log("Decoder type:", typeof params.decoder); // Should log "object"

    console.log("Decoder value:", params.decoder); // Should show parsed JSON object
    return prisma.senzor.create({
        data: {
            sensorName: params.sensorName,
            familyId: params.familyId,
            productId: params.productId,
            photograph: params.photograph,
            payloadDecoder: params.payloadDecoder,
            description: params.description,
            decoder: params.decoder as JsonValue ?? undefined,
        },
    });
}

export async function DeleteSensor(id: number) {
    return prisma.senzor.delete({
        where: { id }
    });
}

export async function GetSensors() {
    return prisma.senzor.findMany();
}
