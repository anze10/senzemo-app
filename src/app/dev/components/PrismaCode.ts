"use server"


import { prisma } from "~/server/DATABASE_ACTION/prisma";

export interface ProductionList {
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

    order: number;
}

export async function InsertintoDB(data: ProductionList) {

    return await prisma.productionList.create({ data });
}