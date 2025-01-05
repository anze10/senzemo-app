import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface Sensor {
    name: string;
    product: number;
    familyId: number;
}

export async function GetArrayofDevices(): Promise<Sensor[]> {
    const devices = await prisma.senzor.findMany();
    return devices.map(device => ({
        name: device.sensor_name,
        product: device.Product_id,
        familyId: device.family_id,
    }));
}

