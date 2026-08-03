"use server";
import { prisma } from "~/server/DATABASE_ACTION/prisma";
import type { Order } from "@prisma/client";

export async function GetOrdersFromDB() {
  const orders = await prisma.order.findMany({
    include: {
      items: {
        include: {
          sensor: {
            select: {
              id: true,
              sensorName: true,
            },
          },
        },
      },
    },
  });
  return orders;
}

export async function GetOrderByIdFromDB(id: number) {
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          sensor: {
            select: {
              id: true,
              sensorName: true,
            },
          },
        },
      },
    },
  });
  return order;
}

export async function UpsertOrderInDB(
  orderData: Partial<Order> & {
    id?: number;
    shippingAddress?: {
      street: string;
      city: string;
      postalCode: string;
      country: string;
    };
    items?: Array<{ sensorId: number; quantity: number }>;
  },
) {
  const { id, shippingAddress, items, ...data } = orderData;

  // Flatten shipping address into individual fields
  const flattenedData = {
    ...data,
    ...(shippingAddress && {
      street: shippingAddress.street,
      city: shippingAddress.city,
      postalCode: shippingAddress.postalCode,
      country: shippingAddress.country,
    }),
  };

  if (id) {
    // Update existing order
    const order = await prisma.order.update({
      where: { id },
      data: flattenedData,
      include: {
        items: {
          include: {
            sensor: {
              select: {
                id: true,
                sensorName: true,
              },
            },
          },
        },
      },
    });

    // Handle items update if provided
    if (items) {
      // Delete existing items
      await prisma.orderItem.deleteMany({
        where: { orderId: id },
      });

      // Create new items
      if (items.length > 0) {
        await prisma.orderItem.createMany({
          data: items.map((item) => ({
            orderId: id,
            sensorId: item.sensorId,
            quantity: item.quantity,
          })),
        });
      }
    }

    return order;
  } else {
    // Create new order
    const order = await prisma.order.create({
      data: flattenedData as Omit<Order, "id" | "orderDate">,
      include: {
        items: {
          include: {
            sensor: {
              select: {
                id: true,
                sensorName: true,
              },
            },
          },
        },
      },
    });

    // Create items if provided
    if (items && items.length > 0) {
      await prisma.orderItem.createMany({
        data: items.map((item) => ({
          orderId: order.id,
          sensorId: item.sensorId,
          quantity: item.quantity,
        })),
      });
    }

    return order;
  }
}

export async function DeleteOrderFromDB(id: number) {
  const order = await prisma.order.delete({
    where: { id },
  });
  return order;
}
