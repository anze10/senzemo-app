"use server"


import { prisma } from "./prisma"

import { StockType } from "@prisma/client";



export interface Stock {
    id: number;
    sensorId?: number;
    componentName: string;
    quantityInStock: number;
    type?: StockType;
    // sensor?: Senzor;
}

export function AddOrUpdateStock(stock: Stock) {
    return prisma.stock.upsert({
        where: { id: stock.id },
        update: {
            sensorId: stock.sensorId,
            componentName: stock.componentName,
            quantityInStock: stock.quantityInStock,
            type: stock.type
        },
        create: {
            sensorId: stock.sensorId,
            componentName: stock.componentName,
            quantityInStock: stock.quantityInStock,
            type: stock.type
        }
    })
}

export function GetStockById(id: number) {
    return prisma.stock.findUnique({ where: { id } })
}

export function GetAllStocks() {
    return prisma.stock.findMany()
}

export async function handleSensorSale(sensorId: number, quantitySold: number) {
    const components = await prisma.component.findMany({
        where: { sensorId },
        select: { id: true, requiredQuantity: true }
    });

    const updatePromises = components.map(component => {
        return prisma.stock.updateMany({
            where: {
                componentStocks: {
                    some: {
                        componentId: component.id
                    }
                }
            },
            data: {
                quantityInStock: {
                    decrement: component.requiredQuantity * quantitySold
                }
            }
        });
    });

    await Promise.all(updatePromises);
}

