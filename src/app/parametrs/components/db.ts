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

export async function CreateOrUpdateOrder(
  customerName: string,
  orderNumber: number,
) {
  const order = await prisma.order.upsert({
    where: { orderNumber },
    update: {
      customerName,
      assemblerName: "", // Update assembler name if needed
    },
    create: {
      customerName,
      assemblerName: "", // Set a default value or pass it as a parameter
      orderNumber,
    },
  });
  return order.id;
}

export async function GetNextOrderNumber(): Promise<number> {
  const lastOrder = await prisma.order.findFirst({
    orderBy: { orderNumber: "desc" },
    select: { orderNumber: true },
  });

  return lastOrder ? lastOrder.orderNumber + 1 : 1;
}

export async function CreateOrder(customerName: string, orderNumber: number) {
  // Check if order number already exists
  const existingOrder = await prisma.order.findUnique({
    where: { orderNumber },
  });

  if (existingOrder) {
    throw new Error(`Order with number ${orderNumber} already exists`);
  }

  const order = await prisma.order.create({
    data: {
      customerName,
      assemblerName: "", // Set a default value or pass it as a parameter
      orderNumber,
    },
  });
  return order.id;
}

export async function CreateOrderWithAutoNumber(customerName: string) {
  const nextOrderNumber = await GetNextOrderNumber();

  const order = await prisma.order.create({
    data: {
      customerName,
      assemblerName: "", // Set a default value or pass it as a parameter
      orderNumber: nextOrderNumber,
    },
  });
  return { id: order.id, orderNumber: nextOrderNumber };
}
