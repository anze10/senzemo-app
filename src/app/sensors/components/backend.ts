"use server"

import { prisma } from "~/server/DATABASE_ACTION/prisma";

interface Sensor {
    id_senzorja: number;
    sensor_name: string;
    family_id: number;
    Product_id: number;
    fotografija?: string;
    payloadDecoder?: string;
    parametri?: string;
    string?: string;
    decoder?: string;
    frekvenca?: string;
}
export async function UpdateorAddSenor(params: Sensor) {
    return prisma.senzor.upsert({
        where: { id: params.id_senzorja },
        update: {
            sensorName: params.sensor_name,
            familyId: params.family_id,
            productId: params.Product_id,
            photograph: params.fotografija,
            payloadDecoder: params.payloadDecoder,

            description: params.string,
            decoder: params.decoder,


        },
        create: {
            id: params.id_senzorja,
            sensorName: params.sensor_name,
            familyId: params.family_id,
            productId: params.Product_id,
            photograph: params.fotografija,
            payloadDecoder: params.payloadDecoder,

            description: params.string,
            decoder: params.decoder,

        },
    });


}


export async function DeleteSensor(id: number) {
    return prisma.senzor.delete({
        where: {
            id: id
        }
    });
}
export async function GetSensor(id: number) {
    return prisma.senzor.findUnique({
        where: {
            id: id
        }
    });
}
export async function GetSensors() {
    return prisma.senzor.findMany();
}

