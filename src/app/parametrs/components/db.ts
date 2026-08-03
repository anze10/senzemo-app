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
    where: { id: orderNumber }, // Using id instead since orderNumber doesn't exist as unique field
    update: {
      customerName,
      assemblier: "", // Update assembler name if needed (note: it's 'assemblier' in schema, not 'assemblerName')
    },
    create: {
      orderName: `Order-${orderNumber}`, // Generate orderName from orderNumber
      customerName,
      assemblier: "", // Set a default value or pass it as a parameter
      street: "",
      city: "",
      postalCode: "",
      country: "",
      frequency: "",
      date: "",
      description: "",
      shippingCost: 0,
      priority: "",
    },
  });
  return order.id;
}

export async function GetNextOrderNumber(): Promise<number> {
  const lastOrder = await prisma.order.findFirst({
    orderBy: { id: "desc" }, // Using id instead of orderNumber
    select: { id: true },
  });

  return lastOrder ? lastOrder.id + 1 : 1;
}

export async function CreateOrder(customerName: string, orderNumber: number) {
  // Check if order ID already exists
  const existingOrder = await prisma.order.findUnique({
    where: { id: orderNumber },
  });

  if (existingOrder) {
    throw new Error(`Order with ID ${orderNumber} already exists`);
  }

  const order = await prisma.order.create({
    data: {
      orderName: `Order-${orderNumber}`,
      customerName,
      assemblier: "", // Set a default value or pass it as a parameter
      street: "",
      city: "",
      postalCode: "",
      country: "",
      frequency: "",
      date: "",
      description: "",
      shippingCost: 0,
      priority: "",
    },
  });
  return order.id;
}

export async function CreateOrderWithAutoNumber(customerName: string) {
  const nextOrderNumber = await GetNextOrderNumber();

  const order = await prisma.order.create({
    data: {
      orderName: `Order-${nextOrderNumber}`,
      customerName,
      assemblier: "", // Set a default value or pass it as a parameter
      street: "",
      city: "",
      postalCode: "",
      country: "",
      frequency: "",
      date: "",
      description: "",
      shippingCost: 0,
      priority: "",
    },
  });
  return { id: order.id, orderNumber: nextOrderNumber };
}
