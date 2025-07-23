"use server";

import { prisma } from "~/server/DATABASE_ACTION/prisma";

export async function GetSensors() {
  return prisma.senzor.findMany();
}

//  id              Int              @id @default(autoincrement())
//   customerName    String
//   assemblerName   String
//   senzorId        Int
//   quantity        Int
//   frequency       String
//   orderDate       DateTime
//   otherParameters String?
//   productionLists ProductionList[]
//   senzor          Senzor           @relation(fields: [senzorId], references: [id])

export async function CreateOrder(customerName: string, orderNumber: number) {
  const order = await prisma.order.create({
    data: {
      customerName,
      assemblerName: "", // Set a default value or pass it as a parameter
      orderNumber,
    },
  });
  return order.id;
}
