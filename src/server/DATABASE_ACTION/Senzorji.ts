"use server"

import { prisma } from "./prisma"
export interface Senzor {
    id?: number
    sensorName: string
    familyId: number
    productId: number
    photograph?: string
    payloadDecoder?: string
    parameters?: string
    decoder?: string
    description?: string
}

export function AddOrUpdateSenzor(Senzor: Senzor) {
    return prisma.senzor.upsert({
        where: { id: Senzor.id },
        update: {
            sensorName: Senzor.sensorName,
            familyId: Senzor.familyId,
            productId: Senzor.productId,
            photograph: Senzor.photograph,
            payloadDecoder: Senzor.payloadDecoder,

            decoder: Senzor.decoder,
            description: Senzor.description
        },
        create: {
            sensorName: Senzor.sensorName,
            familyId: Senzor.familyId,
            productId: Senzor.productId,
            photograph: Senzor.photograph,
            payloadDecoder: Senzor.payloadDecoder,

            decoder: Senzor.decoder,
            description: Senzor.description
        }
    })
}

export function GetSenzorById(id: number) {
    return prisma.senzor.findUnique({ where: { id } })
}

export function GetAllSenzors() {
    return prisma.senzor.findMany()
}

export function DeleteSenzor(id: number) {
    return prisma.senzor.delete({ where: { id } })
}
