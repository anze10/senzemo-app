"use server"

import { prisma } from "~/server/DATABASE_ACTION/prisma";
import type { ComponentStockItem, LogEntry } from "~/app/inventory/components/InventoryManagement";
//import { getUser } from "src/server/LOGIN_LUCIA_ACTION/lucia"



export async function getSensors() {
    try {
        const sensors = await prisma.senzor.findMany({
            select: { id: true, sensorName: true },
        });
        return sensors;
    } catch (error) {
        console.error("Error fetching sensors:", error);
        throw new Error("Failed to fetch sensors");
    }
}


export async function addSensorToInventory(
    sensorId: number,
    quantity: number,
    location: string,
    frequency: string | null = null,
    BN: number,
    dev_eui: string
) {
    try {
        const result = await prisma.$transaction(async (tx) => {
            // 1. Check if dev_eui already exists
            const existingDevEui = await tx.productionList.findUnique({
                where: { DevEUI: dev_eui },
            });

            if (existingDevEui) {
                throw new Error("The provided dev_eui already exists in the ProductionList table.");
            }

            // 2. Create the dev_eui in productionList
            await tx.productionList.create({
                data: {
                    DevEUI: dev_eui,

                    FrequencyRegion: "EU868",

                    //order: undefined,
                    // orderId: 0 // Provide a suitable default or value for 'order'
                    // If you want to leave it unset, remove the field or set to undefined
                    // order: undefined,
                },
            });



            // 4. Create the stock entry
            const sensorStock = await tx.senzorStock.create({
                data: {
                    senzorId: sensorId,
                    quantity,
                    location,
                    frequency,
                    productionBatch: BN,
                    productionListDevEUI: dev_eui,
                },
            });

            // Fetch the sensor name for logging
            const sensor = await tx.senzor.findUnique({
                where: { id: sensorId },
                select: { sensorName: true }
            });

            // 5. Log inventory
            await tx.inventoryLog.create({
                data: {
                    itemType: "sensor",
                    itemName: sensor?.sensorName || "Unknown",
                    change: quantity,
                    reason: "Proizvodnja",
                    user: "Neznan uporabnik",
                    details: `Serijska številka proizvodne serije: ${BN || 'Ni podatka'}`,
                },
            });

            return sensorStock;
        });

        return result;
    } catch (error) {
        console.error("Error adding sensor to inventory:", error);
        throw new Error("Failed to add sensor to inventory");
    }
}




export async function showSensorInInventory() {
    try {
        const sensors = await prisma.senzorStock.findMany({
            include: {
                senzor: {
                    select: { id: true, sensorName: true },
                },
                logs: {
                    orderBy: { timestamp: "desc" },
                    take: 5,
                    select: {
                        timestamp: true,
                        change: true,
                        reason: true,
                        user: true,
                        details: true
                    }
                },
            },
        });

        return sensors.map(stock => ({
            id: stock.id,
            sensorId: stock.senzorId,
            sensorName: stock.senzor.sensorName,
            frequency: stock.frequency,
            quantity: stock.quantity,
            location: stock.location,
            productionBatch: stock.productionBatch,
            lastUpdated: stock.lastUpdated,
            recentLogs: stock.logs
        }));
    } catch (error) {
        console.error("Error fetching sensors in inventory:", error);
        throw new Error("Failed to fetch sensors in inventory");
    }
}

export async function adjustSensorStock(
    stockId: number,
    quantity: number,
    dev_eui: string,
    reason: string,

) {

    try {
        // const user = await getUser();
        // if (!user?.email) {
        //     throw new Error("User authentication required");
        // }

        const result = await prisma.$transaction(async (prisma) => {
            // Preveri, če dev_eui že obstaja v bazi (ProductionList)
            const existing = await prisma.productionList.findUnique({
                where: { DevEUI: dev_eui }
            });
            if (existing) {
                throw new Error("Ta senzor (dev_eui) je že dodeljen in ga ni mogoče ponovno shraniti.");
            }

            // Preveri trenutno stanje
            const currentStock = await prisma.senzorStock.findUnique({
                where: { id: stockId },
                include: {
                    senzor: {
                        select: { sensorName: true }
                    }
                }
            });

            if (!currentStock) {
                throw new Error("Stock item not found");
            }

            // Preveri, da količina ne postane negativna
            const newQuantity = currentStock.quantity + quantity;
            if (newQuantity < 0) {
                throw new Error("Insufficient stock for this operation");
            }

            // Posodobi zalogo
            const updatedStock = await prisma.senzorStock.update({
                where: { id: stockId },
                data: {
                    quantity: newQuantity,
                    lastUpdated: new Date()
                },
            });
            const details: string = "No details provided"

            const log = await prisma.inventoryLog.create({
                data: {
                    itemType: "sensor",
                    //itemId: stockId,
                    itemName: currentStock.senzor.sensorName,
                    change: quantity,
                    reason: reason,
                    user: "Neznan uporabnik",
                    details: details,
                    invoiceId: undefined,

                }
            });



            return {
                stock: updatedStock,
                log,
                previousQuantity: currentStock.quantity
            };
        });

        return result;
    } catch (error) {
        console.error("Error updating sensor stock:", error);
        throw new Error(error instanceof Error ? error.message : "Failed to update sensor stock");
    }
}


///// za kasneje 

// export async function produceSensors(
//     sensorId: number,
//     quantity: number,
//     productionBatch: number,
//     location = "Proizvodna linja 1"
// ) {
//     try {
//         const sensor = await prisma.senzor.findUnique({
//             where: { id: sensorId },
//             select: { sensorName: true, frequency: true }
//         });

//         if (!sensor) {
//             throw new Error("Sensor not found");
//         }

//         const result = await addSensorToInventory(
//             sensorId,
//             quantity,
//             location,
//             sensor.frequency || "868 MHz",
//             productionBatch
//         );

//         return result;
//     } catch (error) {
//         console.error("Error producing sensors:", error);
//         throw new Error("Failed to produce sensors");
//     }
// }

// // Funkcija za uporabo senzorjev v proizvodnji naprav
// export async function useSensorsInProduction(
//     stockId: number,
//     quantity: number,
//     productionOrderId: string,
//     deviceType: string
// ) {
//     try {
//         const result = await adjustSensorStock(
//             stockId,
//             -quantity,
//             "Uporaba v proizvodnji",
//             `Proizvodnja naprave: ${deviceType}, Naročilo: ${productionOrderId}`
//         );

//         return result;
//     } catch (error) {
//         console.error("Error using sensors in production:", error);
//         throw new Error("Failed to use sensors in production");
//     }
// }





//////////////COMPONENTE///////////////////////////////////////////////////////////////////



export async function showAllComponents() {
    try {
        const sensors = await prisma.componentStock.findMany({
            include: {
                component: {
                    select: {
                        id: true,
                        name: true,
                        senzorComponent: {   // <-- NESTED HERE, not at the same level as 'component'
                            include: {
                                senzor: {
                                    select: { id: true, sensorName: true }
                                }
                            }
                        }
                    }
                },
                logs: {
                    orderBy: { timestamp: "desc" },
                    take: 5,
                    select: {
                        timestamp: true,
                        change: true,
                        reason: true,
                        user: true,
                        details: true
                    }
                }
            },
        });

        return sensors.map(stock => ({
            id: stock.id,
            componentId: stock.componentId,
            name: stock.component.name ?? "Unknown",
            email: stock.email,
            quantity: stock.quantity,
            location: stock.location,
            supplier: stock.supplier,
            lastUpdated: stock.lastUpdated,
            recentLogs: stock.logs,
            sensorAssignments: stock.component.senzorComponent.map(sc => ({
                sensorId: sc.senzorId,
                sensorName: sc.senzor?.sensorName ?? "Unnamed Sensor",
                requiredQuantity: sc.requiredQuantity
            })),
            contactDetails: {
                email: stock.email ?? "",
                supplier: stock.supplier ?? "",
                phone: stock.phone ?? ""
            }
        })) as ComponentStockItem[];
    } catch (error) {
        console.error("Error fetching sensors in inventory:", error);
        throw new Error("Failed to fetch sensors in inventory");
    }
}

export async function adjustComponentStock(
    stockId: number,
    quantity: number,
    reason: string,
    invoiceNumber: string | null = null
) {
    try {
        const result = await prisma.$transaction(async (tx) => {
            const currentStock = await tx.componentStock.findUnique({
                where: { id: stockId },
                include: {
                    component: {
                        select: {
                            id: true,
                            name: true,
                            senzorComponent: {
                                include: {
                                    senzor: {
                                        select: {
                                            id: true,
                                            sensorName: true,
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            });

            if (!currentStock) throw new Error("Component stock item not found");

            const newQuantity = currentStock.quantity + quantity;
            if (newQuantity < 0) throw new Error("Insufficient stock");

            const updatedStock = await tx.componentStock.update({
                where: { id: stockId },
                data: {
                    quantity: newQuantity,
                    lastUpdated: new Date()
                }
            });

            await tx.inventoryLog.create({
                data: {
                    itemType: "component",
                    itemName: currentStock.component.name,
                    change: quantity,
                    reason,
                    user: "Neznan uporabnik",
                    details: invoiceNumber ? `Invoice: ${invoiceNumber}` : "No details provided"
                }
            });

            return {
                ...updatedStock,
                component: currentStock.component
            };
        });

        return result;
    } catch (error) {
        console.error("Error updating component stock:", error);
        throw new Error("Failed to update component stock");
    }
}



export async function addComponentToInventory(
    componentId: number,
    quantity: number,
    location: string,
    email: string | null = null,
    supplier: string | null = null,
    invoiceNumber: string | null = null
) {
    try {
        const result = await prisma.$transaction(async (tx) => {
            const componentStock = await tx.componentStock.create({
                data: {
                    componentId,
                    quantity,
                    location,
                    email,
                    supplier
                }
            });

            const component = await tx.component.findUnique({
                where: { id: componentId },
                select: {
                    id: true,
                    name: true,
                    senzorComponent: {
                        include: {
                            senzor: {
                                select: {
                                    id: true,
                                    sensorName: true
                                }
                            }
                        }
                    }
                }
            });

            await tx.inventoryLog.create({
                data: {
                    itemType: "component",
                    itemName: component?.name ?? "Unknown",
                    change: quantity,
                    reason: "Proizvodnja",
                    user: "Neznan uporabnik",
                    details: invoiceNumber
                        ? `Komponenta ID: ${componentId} | Invoice: ${invoiceNumber}`
                        : `Komponenta ID: ${componentId}`
                }
            });

            return {
                ...componentStock,
                component
            };
        });

        return result;
    } catch (error) {
        console.error("Error adding component to inventory:", error);
        throw new Error("Failed to add component to inventory");
    }
}



export async function updateComponentStock(
    stockId: number,
    newQuantity: number,
    reason: string,
    invoiceNumber: string | null = null,
    location?: string,
    email?: string,
    supplier?: string,
    phone?: string // <-- Dodaj ta parameter!
) {
    try {
        const updated = await prisma.componentStock.update({
            where: { id: stockId },
            data: {
                quantity: newQuantity,
                location,
                supplier: supplier ?? '',
                email: email ?? '',
                phone: phone ?? '', // <-- Shrani telefonsko številko!
                lastUpdated: new Date(),
            },
        });
        // ...logika za inventoryLog...
        return updated;
    } catch (error) {
        throw new Error("Failed to update component stock", error as Error);
    }
}
export async function updateComponentSensorAssignments(
    componentId: number,
    assignments: { sensorId: number; requiredQuantity: number }[]
) {
    try {
        // Najprej izbriši vse obstoječe povezave za to komponento
        await prisma.senzorComponent.deleteMany({
            where: { componentId }
        });

        // Nato dodaj nove povezave
        for (const assignment of assignments) {
            await prisma.senzorComponent.create({
                data: {
                    componentId,
                    senzorId: assignment.sensorId,
                    requiredQuantity: assignment.requiredQuantity
                }
            });
        }
        return true;
    } catch (error) {
        console.error("Error updating sensor assignments:", error);
        throw new Error("Failed to update sensor assignments");
    }
}


export async function deleteSensorFromInventory(stockId: number) {
    try {
        await prisma.senzorStock.delete({
            where: { id: stockId }
        });
        return true;
    } catch (error) {
        console.error("Error deleting sensor from inventory:", error);
        throw new Error("Failed to delete sensor from inventory");
    }
}

export async function deleteComponentFromInventory(stockId: number) {
    try {
        await prisma.componentStock.delete({
            where: { id: stockId }
        });
        return true;
    } catch (error) {
        console.error("Error deleting component from inventory:", error);
        throw new Error("Failed to delete component from inventory");
    }
}

export async function showLogs() {
    try {
        const result = await prisma.inventoryLog.findMany({
            include: {
                invoice: {
                    select: {
                        id: true,
                        invoiceNumber: true
                    }
                }
            },
        });
        return result.map(log => ({
            user: log.user,
            id: log.id,
            invoiceId: log.invoiceId ?? null,
            invoiceNumber: log.invoice?.invoiceNumber ? `INV-${log.invoiceId}` : null,
            timestamp: log.timestamp,
            itemType: log.itemType,
            itemName: log.itemName,
            change: log.change,
            reason: log.reason,
            details: log.details ?? null,
            senzorStockId: log.senzorStockId ?? null,
            componentStockId: log.componentStockId ?? null
        })) as LogEntry[];

    } catch (error) {
        console.error("Error deleting component from inventory:", error);
        throw new Error("Failed to delete component from inventory");
    }
}

export async function getAllComponents() {
    try {
        return await prisma.component.findMany({
            select: { id: true, name: true }
        });
    } catch (error) {
        console.error("Error fetching all components:", error);
        throw new Error("Failed to fetch all components");
    }
}