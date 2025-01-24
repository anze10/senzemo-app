"use server"

import { prisma } from "~/server/prisma";

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
        where: { id_senzorja: params.id_senzorja },
        update: {
            sensor_name: params.sensor_name,
            family_id: params.family_id,
            Product_id: params.Product_id,
            fotografija: params.fotografija,
            payloadDecoder: params.payloadDecoder,
            parametri: params.parametri,
            string: params.string,
            decoder: params.decoder,
            frekvenca: params.frekvenca

        },
        create: {
            id_senzorja: params.id_senzorja,
            sensor_name: params.sensor_name,
            family_id: params.family_id,
            Product_id: params.Product_id,
            fotografija: params.fotografija,
            payloadDecoder: params.payloadDecoder,
            parametri: params.parametri,
            string: params.string,
            decoder: params.decoder,
            frekvenca: params.frekvenca
        },
    });


}


export async function DeleteSensor(id: number) {
    return prisma.senzor.delete({
        where: {
            id_senzorja: id
        }
    });
}
export async function GetSensor(id: number) {
    return prisma.senzor.findUnique({
        where: {
            id_senzorja: id
        }
    });
}
export async function GetSensors() {
    return prisma.senzor.findMany();
}

