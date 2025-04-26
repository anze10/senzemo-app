"use server";
import { prisma } from "~/server/DATABASE_ACTION/prisma";

export interface Sensor {
  name: string;
  product: number;
  familyId: number;
  deafult_data: string;
}

export async function GetArrayofDevices(): Promise<Sensor[]> {
  console.log("Vstop v funkcijo GetArrayofDevices");
  try {
    const naprave = await prisma.senzor.findMany();
    console.log("Prejete naprave iz baze:", naprave);

    const seznam: Sensor[] = naprave.map((device) => ({
      name: device.sensorName,
      product: device.productId,
      familyId: device.familyId,
      deafult_data: device.description ?? "",
    }));

    console.log("Oblikovan seznam senzorjev:", seznam);
    return seznam;
  } catch (error) {
    console.error("Napaka pri pridobivanju podatkov iz baze:", error);
    return [];
  }
}
