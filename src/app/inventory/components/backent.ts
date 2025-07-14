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
    dev_eui: string,
    //deviceType?: string
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

            // 2. Get sensor information to determine DeviceType if not provided
            const sensorInfo = await tx.senzor.findUnique({
                where: { id: sensorId },
                select: { id: true, sensorName: true, familyId: true, productId: true }
            });

            if (!sensorInfo) {
                throw new Error(`Sensor with ID ${sensorId} not found`);
            }

            // 3. Determine DeviceType - use provided deviceType or generate from sensor info
            const finalDeviceType = sensorInfo.sensorName;

            // 4. Map frequency to FrequencyRegion format
            const mapFrequencyToRegion = (freq: string | null): string => {
                if (!freq) return 'EU868';
                switch (freq) {
                    case '868 MHz': return 'EU868';
                    case '915 MHz': return 'US915';
                    case '433 MHz': return 'EU433';
                    case '2.4 GHz': return 'ISM2400';
                    default: return 'EU868';
                }
            };

            // 5. Create the dev_eui in productionList
            await tx.productionList.create({
                data: {
                    DevEUI: dev_eui,
                    DeviceType: finalDeviceType,
                    FrequencyRegion: mapFrequencyToRegion(frequency),
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
            productionListDevEUI: stock.productionListDevEUI, // Dodano za DevEUI
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
    reason: string
) {
    try {
        const result = await prisma.$transaction(async (tx) => {
            // Preveri trenutno stanje
            const currentStock = await tx.senzorStock.findUnique({
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
            const updatedStock = await tx.senzorStock.update({
                where: { id: stockId },
                data: {
                    quantity: newQuantity,
                    lastUpdated: new Date()
                },
            });

            // Logiraj spremembo
            await tx.inventoryLog.create({
                data: {
                    itemType: "sensor",
                    itemName: currentStock.senzor.sensorName,
                    change: quantity,
                    reason: reason,
                    user: "Neznan uporabnik",
                    details: `DevEUI: ${currentStock.productionListDevEUI || 'N/A'} | Quantity: ${currentStock.quantity} → ${newQuantity}`,
                    senzorStockId: stockId
                }
            });

            return {
                stock: updatedStock,
                previousQuantity: currentStock.quantity,
                newQuantity: newQuantity
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
    invoiceNumber?: string | null,
    location?: string,
    email?: string,
    supplier?: string,
    phone?: string
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

// =====================================
// HIERARHIČNE FUNKCIJE ZA SENZORJE
// =====================================

/**
 * Hierarhična struktura senzorjev po tipih in frekvencah
 */
export async function getSensorHierarchy() {
    try {
        const sensors = await prisma.senzorStock.findMany({
            include: {
                senzor: {
                    select: { id: true, sensorName: true },
                },
            },
        });

        // Grupiraj po senzorju (tip)
        const sensorGroups = new Map();

        sensors.forEach(stock => {
            const sensorKey = `${stock.senzorId}-${stock.senzor.sensorName}`;

            if (!sensorGroups.has(sensorKey)) {
                sensorGroups.set(sensorKey, {
                    sensorId: stock.senzorId,
                    sensorName: stock.senzor.sensorName,
                    totalQuantity: 0,
                    frequencies: new Map()
                });
            }

            const group = sensorGroups.get(sensorKey);
            group.totalQuantity += stock.quantity;

            // Grupiraj po frekvenci
            const frequency = stock.frequency || '868 MHz';
            if (!group.frequencies.has(frequency)) {
                group.frequencies.set(frequency, {
                    frequency,
                    totalQuantity: 0,
                    devices: []
                });
            }

            const freqGroup = group.frequencies.get(frequency);
            freqGroup.totalQuantity += stock.quantity;
            freqGroup.devices.push({
                id: stock.id,
                senzorId: stock.senzorId,
                sensorName: stock.senzor.sensorName,
                quantity: stock.quantity,
                location: stock.location,
                lastUpdated: stock.lastUpdated,
                frequency: stock.frequency,
                dev_eui: stock.productionListDevEUI,
                productionBatch: stock.productionBatch
            });
        });

        // Pretvori v array format
        return Array.from(sensorGroups.values()).map(group => ({
            ...group,
            frequencies: Array.from(group.frequencies.values())
        }));

    } catch (error) {
        console.error("Error fetching sensor hierarchy:", error);
        throw new Error("Failed to fetch sensor hierarchy");
    }
}

/**
 * Dobi senzorje po določeni frekvenci
 */
export async function getSensorsByFrequency(sensorId: number, frequency: string) {
    try {
        const sensors = await prisma.senzorStock.findMany({
            where: {
                senzorId: sensorId,
                frequency: frequency
            },
            include: {
                senzor: {
                    select: { id: true, sensorName: true },
                },
            },
        });

        return sensors.map(stock => ({
            id: stock.id,
            senzorId: stock.senzorId,
            sensorName: stock.senzor.sensorName,
            quantity: stock.quantity,
            location: stock.location,
            lastUpdated: stock.lastUpdated,
            frequency: stock.frequency,
            dev_eui: stock.productionListDevEUI,
            productionBatch: stock.productionBatch
        }));

    } catch (error) {
        console.error("Error fetching sensors by frequency:", error);
        throw new Error("Failed to fetch sensors by frequency");
    }
}

/**
 * Dobi povzetek količin po senzorjih
 */
export async function getSensorQuantitySummary() {
    try {
        const summary = await prisma.senzorStock.groupBy({
            by: ['senzorId'],
            _sum: {
                quantity: true
            },
            _count: {
                id: true
            }
        });

        // Dobi imena senzorjev
        const sensorIds = summary.map(s => s.senzorId);
        const sensors = await prisma.senzor.findMany({
            where: { id: { in: sensorIds } },
            select: { id: true, sensorName: true }
        });

        return summary.map(item => {
            const sensor = sensors.find(s => s.id === item.senzorId);
            return {
                sensorId: item.senzorId,
                sensorName: sensor?.sensorName || 'Unknown',
                totalQuantity: item._sum.quantity || 0,
                deviceCount: item._count.id || 0
            };
        });

    } catch (error) {
        console.error("Error fetching sensor quantity summary:", error);
        throw new Error("Failed to fetch sensor quantity summary");
    }
}

/**
 * Dobi povzetek količin po frekvencah za določen senzor
 */
export async function getSensorFrequencySummary(sensorId: number) {
    try {
        const summary = await prisma.senzorStock.groupBy({
            by: ['frequency'],
            where: { senzorId: sensorId },
            _sum: {
                quantity: true
            },
            _count: {
                id: true
            }
        });

        return summary.map(item => ({
            frequency: item.frequency || '868 MHz',
            totalQuantity: item._sum.quantity || 0,
            deviceCount: item._count.id || 0
        }));

    } catch (error) {
        console.error("Error fetching sensor frequency summary:", error);
        throw new Error("Failed to fetch sensor frequency summary");
    }
}

/**
 * Preveri če DevEUI že obstaja
 */
export async function checkDevEUIExists(devEUI: string): Promise<boolean> {
    try {
        const existing = await prisma.productionList.findUnique({
            where: { DevEUI: devEUI }
        });
        return !!existing;
    } catch (error) {
        console.error("Error checking DevEUI:", error);
        throw new Error("Failed to check DevEUI");
    }
}

/**
 * Dobi podrobne informacije o senzorju po DevEUI
 */
export async function getSensorByDevEUI(devEUI: string) {
    try {
        const sensor = await prisma.senzorStock.findFirst({
            where: { productionListDevEUI: devEUI },
            include: {
                senzor: {
                    select: { id: true, sensorName: true, description: true },
                },
                logs: {
                    orderBy: { timestamp: "desc" },
                    take: 10,
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

        if (!sensor) {
            throw new Error("Sensor not found");
        }

        return {
            id: sensor.id,
            senzorId: sensor.senzorId,
            sensorName: sensor.senzor.sensorName,
            quantity: sensor.quantity,
            location: sensor.location,
            lastUpdated: sensor.lastUpdated,
            frequency: sensor.frequency,
            dev_eui: sensor.productionListDevEUI,
            productionBatch: sensor.productionBatch,
            description: sensor.senzor.description,
            recentLogs: sensor.logs
        };

    } catch (error) {
        console.error("Error fetching sensor by DevEUI:", error);
        throw new Error("Failed to fetch sensor by DevEUI");
    }
}

/**
 * Masovno posodobi zaloge senzorjev
 */
export async function bulkUpdateSensorStock(updates: Array<{
    stockId: number;
    quantity: number;
    reason: string;
}>) {
    try {
        const results = await prisma.$transaction(async (tx) => {
            const updatePromises = updates.map(async (update) => {
                const currentStock = await tx.senzorStock.findUnique({
                    where: { id: update.stockId },
                    include: {
                        senzor: { select: { sensorName: true } }
                    }
                });

                if (!currentStock) {
                    throw new Error(`Stock item ${update.stockId} not found`);
                }

                const newQuantity = update.quantity;
                if (newQuantity < 0) {
                    throw new Error(`Invalid quantity for stock ${update.stockId}`);
                }

                const updatedStock = await tx.senzorStock.update({
                    where: { id: update.stockId },
                    data: {
                        quantity: newQuantity,
                        lastUpdated: new Date()
                    }
                });

                await tx.inventoryLog.create({
                    data: {
                        itemType: "sensor",
                        itemName: currentStock.senzor.sensorName,
                        change: newQuantity - currentStock.quantity,
                        reason: update.reason,
                        user: "Bulk Update",
                        details: `Bulk quantity update: ${currentStock.quantity} → ${newQuantity}`
                    }
                });

                return updatedStock;
            });

            return Promise.all(updatePromises);
        });

        return results;

    } catch (error) {
        console.error("Error bulk updating sensor stock:", error);
        throw new Error("Failed to bulk update sensor stock");
    }
}

/**
 * Dodaj nov senzor v zalogo z DevEUI validacijo (optimizirano za hierarhični prikaz)
 */
export async function addSensorToInventoryHierarchical(
    sensorId: number,
    quantity: number,
    location: string,
    frequency: string,
    dev_eui: string,
    productionBatch?: number
) {
    try {
        const result = await prisma.$transaction(async (tx) => {
            // 1. Preveri če DevEUI že obstaja
            if (dev_eui && dev_eui.trim()) {
                const existingDevEui = await tx.productionList.findUnique({
                    where: { DevEUI: dev_eui },
                });

                if (existingDevEui) {
                    throw new Error(`DevEUI ${dev_eui} že obstaja v sistemu.`);
                }

                // 2. Ustvari DevEUI v ProductionList
                await tx.productionList.create({
                    data: {
                        DevEUI: dev_eui,
                        FrequencyRegion: frequency === '868 MHz' ? 'EU868' :
                            frequency === '915 MHz' ? 'US915' :
                                frequency === '433 MHz' ? 'EU433' : 'EU868',
                    },
                });
            }

            // 3. Preveri če senzor obstaja
            const sensor = await tx.senzor.findUnique({
                where: { id: sensorId },
                select: { id: true, sensorName: true }
            });

            if (!sensor) {
                throw new Error(`Senzor z ID ${sensorId} ne obstaja.`);
            }

            // 4. Ustvari zaloga vnos
            const sensorStock = await tx.senzorStock.create({
                data: {
                    senzorId: sensorId,
                    quantity,
                    location,
                    frequency,
                    productionBatch: productionBatch || null,
                    productionListDevEUI: dev_eui || null,
                },
            });

            // 5. Logiraj
            await tx.inventoryLog.create({
                data: {
                    itemType: "sensor",
                    itemName: sensor.sensorName,
                    change: quantity,
                    reason: "Dodajanje v zalogo",
                    user: "System",
                    details: `Senzor: ${sensor.sensorName} | DevEUI: ${dev_eui || 'N/A'} | Frekvenca: ${frequency} | Batch: ${productionBatch || 'N/A'}`,
                    senzorStockId: sensorStock.id
                },
            });

            return {
                ...sensorStock,
                sensorName: sensor.sensorName
            };
        });

        return result;
    } catch (error) {
        console.error("Error adding sensor to inventory:", error);
        throw new Error(error instanceof Error ? error.message : "Failed to add sensor to inventory");
    }
}

/**
 * Prenesi senzor iz ene lokacije v drugo
 */
export async function transferSensorLocation(
    stockId: number,
    newLocation: string,
    reason: string
) {
    try {
        const result = await prisma.$transaction(async (tx) => {
            const currentStock = await tx.senzorStock.findUnique({
                where: { id: stockId },
                include: {
                    senzor: { select: { sensorName: true } }
                }
            });

            if (!currentStock) {
                throw new Error("Sensor stock not found");
            }

            const updatedStock = await tx.senzorStock.update({
                where: { id: stockId },
                data: {
                    location: newLocation,
                    lastUpdated: new Date()
                }
            });

            await tx.inventoryLog.create({
                data: {
                    itemType: "sensor",
                    itemName: currentStock.senzor.sensorName,
                    change: 0, // Ni spremembe količine
                    reason: `Location transfer: ${reason}`,
                    user: "System",
                    details: `DevEUI: ${currentStock.productionListDevEUI || 'N/A'} | ${currentStock.location} → ${newLocation}`,
                    senzorStockId: stockId
                }
            });

            return updatedStock;
        });

        return result;
    } catch (error) {
        console.error("Error transferring sensor location:", error);
        throw new Error("Failed to transfer sensor location");
    }
}

/**
 * Utility funkcije za hierarhični prikaz
 */

// Generiraj naključen DevEUI


// Validiraj DevEUI format
export async function validateDevEUI(devEUI: string): Promise<boolean> {
    const hexPattern = /^[0-9A-Fa-f]{16}$/;
    return hexPattern.test(devEUI);
}

// Formatiraj DevEUI za prikaz
export async function formatDevEUI(devEUI: string): Promise<string> {
    if (!devEUI || devEUI.length !== 16) return devEUI;
    return devEUI.match(/.{1,2}/g)?.join(':') || devEUI;
}

/**
 * Statistike zaloge senzorjev
 */
export async function getSensorStockStatistics() {
    try {
        const stats = await prisma.$transaction(async (tx) => {
            // Skupna količina vseh senzorjev
            const totalQuantity = await tx.senzorStock.aggregate({
                _sum: { quantity: true }
            });

            // Število različnih tipov senzorjev
            const sensorTypes = await tx.senzorStock.groupBy({
                by: ['senzorId'],
                _count: { id: true }
            });

            // Število različnih frekvenc
            const frequencies = await tx.senzorStock.groupBy({
                by: ['frequency'],
                _sum: { quantity: true }
            });

            // Število različnih lokacij
            const locations = await tx.senzorStock.groupBy({
                by: ['location'],
                _sum: { quantity: true }
            });

            // Najnovejši vnosi
            const recentAdditions = await tx.inventoryLog.findMany({
                where: {
                    itemType: 'sensor',
                    change: { gt: 0 }
                },
                orderBy: { timestamp: 'desc' },
                take: 5,
                select: {
                    itemName: true,
                    change: true,
                    timestamp: true,
                    reason: true
                }
            });

            return {
                totalQuantity: totalQuantity._sum.quantity || 0,
                sensorTypeCount: sensorTypes.length,
                frequencyDistribution: frequencies.map(f => ({
                    frequency: f.frequency || '868 MHz',
                    quantity: f._sum.quantity || 0
                })),
                locationDistribution: locations.map(l => ({
                    location: l.location,
                    quantity: l._sum.quantity || 0
                })),
                recentAdditions
            };
        });

        return stats;
    } catch (error) {
        console.error("Error fetching sensor statistics:", error);
        throw new Error("Failed to fetch sensor statistics");
    }
}

/**
 * Poišči senzorje z nizko zalogo
 */
export async function getLowStockSensors(threshold: number = 5) {
    try {
        const lowStockSensors = await prisma.senzorStock.findMany({
            where: {
                quantity: { lte: threshold }
            },
            include: {
                senzor: {
                    select: { id: true, sensorName: true }
                }
            },
            orderBy: [
                { quantity: 'asc' },
                { lastUpdated: 'desc' }
            ]
        });

        return lowStockSensors.map(stock => ({
            id: stock.id,
            sensorId: stock.senzorId,
            sensorName: stock.senzor.sensorName,
            quantity: stock.quantity,
            location: stock.location,
            frequency: stock.frequency,
            dev_eui: stock.productionListDevEUI,
            lastUpdated: stock.lastUpdated
        }));
    } catch (error) {
        console.error("Error fetching low stock sensors:", error);
        throw new Error("Failed to fetch low stock sensors");
    }
}

// =====================================
// PRAVILNE HIERARHIČNE FUNKCIJE ZA SENZORJE (PO DEVICE TYPE)
// =====================================

/**
 * Hierarhična struktura senzorjev po DeviceType iz ProductionList tabele
 * Samo senzorji, ki NISO povezani z naročili (orderId = null)
 */
export async function getInventorySensorHierarchy() {
    try {
        // Dobi vse ProductionList zapise, ki NISO povezani z naročili
        const availableDevices = await prisma.productionList.findMany({
            where: {
                orderId: null, // Ni povezan z naročilom = na zalogi
                DevEUI: { not: null } // Ima DevEUI
            },
            include: {
                senzorStocks: {
                    where: {
                        quantity: { gt: 0 } // Samo če je na zalogi
                    },
                    include: {
                        senzor: {
                            select: { id: true, sensorName: true, description: true }
                        }
                    }
                }
            }
        });

        // Grupiraj po DeviceType (nivo 1)
        const deviceGroups = new Map<string, {
            deviceType: string;
            totalDevices: number;
            frequencies: Map<string, {
                frequency: string;
                totalDevices: number;
                devices: {
                    id: number;
                    devEUI: string;
                    deviceType: string | null;
                    sensorId: number;
                    sensorName: string;
                    quantity: number;
                    location: string;
                    frequency: string | null;
                    lastUpdated: Date;
                    productionBatch: number | null;
                    hwVersion: string | null;
                    fwVersion: string | null;
                }[];
            }>;
        }>();

        availableDevices.forEach(device => {
            const deviceType = device.DeviceType || 'Unknown';
            const frequency = device.FrequencyRegion || '868 MHz';

            // Samo če ima povezane stock zapise
            if (device.senzorStocks.length === 0) return;

            // Inicializiraj group za DeviceType
            if (!deviceGroups.has(deviceType)) {
                deviceGroups.set(deviceType, {
                    deviceType,
                    totalDevices: 0,
                    frequencies: new Map()
                });
            }

            const deviceGroup = deviceGroups.get(deviceType)!;
            deviceGroup.totalDevices += 1;

            // Inicializiraj group za frekvenco
            if (!deviceGroup.frequencies.has(frequency)) {
                deviceGroup.frequencies.set(frequency, {
                    frequency,
                    totalDevices: 0,
                    devices: []
                });
            }

            const freqGroup = deviceGroup.frequencies.get(frequency)!;
            freqGroup.totalDevices += 1;

            // Dodaj device podatke
            device.senzorStocks.forEach(stock => {
                freqGroup.devices.push({
                    id: stock.id,
                    devEUI: device.DevEUI ?? "",
                    deviceType: device.DeviceType,
                    sensorId: stock.senzorId,
                    sensorName: stock.senzor.sensorName,
                    quantity: stock.quantity,
                    location: stock.location,
                    frequency: device.FrequencyRegion,
                    lastUpdated: stock.lastUpdated,
                    productionBatch: stock.productionBatch,
                    hwVersion: device.HWVersion,
                    fwVersion: device.FWVersion
                });
            });
        });

        // Pretvori v array format
        return Array.from(deviceGroups.values()).map(group => ({
            deviceType: group.deviceType,
            totalDevices: group.totalDevices,
            frequencies: Array.from(group.frequencies.values())
        }));

    } catch (error) {
        console.error("Error fetching inventory sensor hierarchy:", error);
        throw new Error("Failed to fetch inventory sensor hierarchy");
    }
}

/**
 * Dobi senzorje po DeviceType in frekvenci (za nivo 2)
 */
export async function getDevicesByTypeAndFrequency(deviceType: string, frequency: string) {
    try {
        const devices = await prisma.productionList.findMany({
            where: {
                orderId: null, // Ni povezan z naročilom
                DeviceType: deviceType,
                FrequencyRegion: frequency,
                DevEUI: { not: null }
            },
            include: {
                senzorStocks: {
                    where: {
                        quantity: { gt: 0 }
                    },
                    include: {
                        senzor: {
                            select: { id: true, sensorName: true, description: true }
                        }
                    }
                }
            }
        });

        type DeviceStockInfo = {
            id: number;
            devEUI: string | null;
            deviceType: string | null;
            sensorId: number;
            sensorName: string;
            quantity: number;
            location: string;
            frequency: string | null;
            lastUpdated: Date;
            productionBatch: number | null;
            hwVersion: string | null;
            fwVersion: string | null;
            appEUI: string | null;
            appKey: string | null;
        };

        const result: DeviceStockInfo[] = [];
        devices.forEach(device => {
            device.senzorStocks.forEach(stock => {
                result.push({
                    id: stock.id,
                    devEUI: device.DevEUI,
                    deviceType: device.DeviceType,
                    sensorId: stock.senzorId,
                    sensorName: stock.senzor.sensorName,
                    quantity: stock.quantity,
                    location: stock.location,
                    frequency: device.FrequencyRegion,
                    lastUpdated: stock.lastUpdated,
                    productionBatch: stock.productionBatch,
                    hwVersion: device.HWVersion,
                    fwVersion: device.FWVersion,
                    appEUI: device.AppEUI,
                    appKey: device.AppKey
                });
            });
        });

        return result;

    } catch (error) {
        console.error("Error fetching devices by type and frequency:", error);
        throw new Error("Failed to fetch devices by type and frequency");
    }
}

/**
 * Dobi senzorje po DeviceType (za nivo 1 razširjen)
 */
export async function getDevicesByType(deviceType: string) {
    try {
        const devices = await prisma.productionList.findMany({
            where: {
                orderId: null, // Ni povezan z naročilom
                DeviceType: deviceType,
                DevEUI: { not: null }
            },
            include: {
                senzorStocks: {
                    where: {
                        quantity: { gt: 0 }
                    },
                    include: {
                        senzor: {
                            select: { id: true, sensorName: true, description: true }
                        }
                    }
                }
            }
        });

        // Grupiraj po frekvencah
        type FrequencyGroupDevice = {
            id: number;
            devEUI: string | null;
            deviceType: string | null;
            sensorId: number;
            sensorName: string;
            quantity: number;
            location: string;
            frequency: string | null;
            lastUpdated: Date;
            productionBatch: number | null;
            hwVersion: string | null;
            fwVersion: string | null;
        };
        const frequencyGroups = new Map<string, FrequencyGroupDevice[]>();

        devices.forEach(device => {
            const frequency = device.FrequencyRegion || '868 MHz';

            if (!frequencyGroups.has(frequency)) {
                frequencyGroups.set(frequency, []);
            }

            device.senzorStocks.forEach(stock => {
                frequencyGroups.get(frequency)!.push({
                    id: stock.id,
                    devEUI: device.DevEUI,
                    deviceType: device.DeviceType,
                    sensorId: stock.senzorId,
                    sensorName: stock.senzor.sensorName,
                    quantity: stock.quantity,
                    location: stock.location,
                    frequency: device.FrequencyRegion,
                    lastUpdated: stock.lastUpdated,
                    productionBatch: stock.productionBatch,
                    hwVersion: device.HWVersion,
                    fwVersion: device.FWVersion
                });
            });
        });

        return Array.from(frequencyGroups.entries()).map(([frequency, devices]) => ({
            frequency,
            totalDevices: devices.length,
            devices
        }));

    } catch (error) {
        console.error("Error fetching devices by type:", error);
        throw new Error("Failed to fetch devices by type");
    }
}

/**
 * Dobi podrobnosti naprave po DevEUI (za nivo 3)
 */
export async function getDeviceDetailsByDevEUI(devEUI: string) {
    try {
        const device = await prisma.productionList.findUnique({
            where: { DevEUI: devEUI },
            include: {
                order: {
                    select: {
                        id: true,
                        customerName: true,
                        orderDate: true,
                        quantity: true
                    }
                },
                senzorStocks: {
                    include: {
                        senzor: {
                            select: {
                                id: true,
                                sensorName: true,
                                description: true,
                                familyId: true,
                                productId: true
                            }
                        },
                        logs: {
                            orderBy: { timestamp: "desc" },
                            take: 10,
                            select: {
                                timestamp: true,
                                change: true,
                                reason: true,
                                user: true,
                                details: true
                            }
                        }
                    }
                }
            }
        });

        if (!device) {
            throw new Error("Device not found");
        }

        return {
            devEUI: device.DevEUI,
            deviceType: device.DeviceType,
            frequency: device.FrequencyRegion,
            appEUI: device.AppEUI,
            appKey: device.AppKey,
            hwVersion: device.HWVersion,
            fwVersion: device.FWVersion,
            customFWVersion: device.CustomFWVersion,
            sendPeriod: device.SendPeriod,
            ack: device.ACK,
            movementThreshold: device.MovementThreshold,
            subBands: device.SubBands,
            isAvailable: !device.orderId, // Ali je na zalogi
            order: device.order, // Če je povezan z naročilom
            stockInfo: device.senzorStocks.map(stock => ({
                id: stock.id,
                sensorId: stock.senzorId,
                sensorName: stock.senzor.sensorName,
                quantity: stock.quantity,
                location: stock.location,
                lastUpdated: stock.lastUpdated,
                productionBatch: stock.productionBatch,
                recentLogs: stock.logs,
                sensorDetails: {
                    familyId: stock.senzor.familyId,
                    productId: stock.senzor.productId,
                    description: stock.senzor.description
                }
            }))
        };

    } catch (error) {
        console.error("Error fetching device details by DevEUI:", error);
        throw new Error("Failed to fetch device details by DevEUI");
    }
}

/**
 * Povzetek razpoložljivih naprav po tipih
 */
export async function getAvailableDevicesSummary() {
    try {
        const summary = await prisma.productionList.groupBy({
            by: ['DeviceType'],
            where: {
                orderId: null, // Ni povezan z naročilom
                DevEUI: { not: null },
                senzorStocks: {
                    some: {
                        quantity: { gt: 0 }
                    }
                }
            },
            _count: {
                id: true
            }
        });

        // Dodatne statistike po frekvencah
        const frequencyStats = await prisma.productionList.groupBy({
            by: ['DeviceType', 'FrequencyRegion'],
            where: {
                orderId: null,
                DevEUI: { not: null },
                senzorStocks: {
                    some: {
                        quantity: { gt: 0 }
                    }
                }
            },
            _count: {
                id: true
            }
        });

        return {
            deviceTypes: summary.map(item => ({
                deviceType: item.DeviceType || 'Unknown',
                totalDevices: item._count.id
            })),
            frequencyBreakdown: frequencyStats.map(item => ({
                deviceType: item.DeviceType || 'Unknown',
                frequency: item.FrequencyRegion || '868 MHz',
                count: item._count.id
            }))
        };

    } catch (error) {
        console.error("Error fetching available devices summary:", error);
        throw new Error("Failed to fetch available devices summary");
    }
}

/**
 * Premakni napravo iz zaloge v naročilo
 */
export async function assignDeviceToOrder(devEUI: string, orderId: number, reason: string = "Assigned to order") {
    try {
        const result = await prisma.$transaction(async (tx) => {
            // Preveri če naprava obstaja in ni že dodeljena
            const device = await tx.productionList.findUnique({
                where: { DevEUI: devEUI },
                include: {
                    senzorStocks: {
                        include: {
                            senzor: { select: { sensorName: true } }
                        }
                    }
                }
            });

            if (!device) {
                throw new Error("Device not found");
            }

            if (device.orderId) {
                throw new Error("Device is already assigned to an order");
            }

            // Dodeli napravo naročilu
            const updatedDevice = await tx.productionList.update({
                where: { DevEUI: devEUI },
                data: { orderId: orderId }
            });

            // Logiraj spremembo
            if (device.senzorStocks.length > 0) {
                const stock = device.senzorStocks[0];
                await tx.inventoryLog.create({
                    data: {
                        itemType: "sensor",
                        itemName: stock.senzor.sensorName,
                        change: -1, // Iz zaloge
                        reason: reason,
                        user: "System",
                        details: `DevEUI: ${devEUI} assigned to order ${orderId}`,
                        senzorStockId: stock.id
                    }
                });
            }

            return updatedDevice;
        });

        return result;

    } catch (error) {
        console.error("Error assigning device to order:", error);
        throw new Error(error instanceof Error ? error.message : "Failed to assign device to order");
    }
}

/**
 * Sprosti napravo iz naročila nazaj v zalogo
 */
export async function releaseDeviceFromOrder(devEUI: string, reason: string = "Released from order") {
    try {
        const result = await prisma.$transaction(async (tx) => {
            const device = await tx.productionList.findUnique({
                where: { DevEUI: devEUI },
                include: {
                    order: { select: { id: true, customerName: true } },
                    senzorStocks: {
                        include: {
                            senzor: { select: { sensorName: true } }
                        }
                    }
                }
            });

            if (!device) {
                throw new Error("Device not found");
            }

            if (!device.orderId) {
                throw new Error("Device is not assigned to any order");
            }

            // Sprosti napravo
            const updatedDevice = await tx.productionList.update({
                where: { DevEUI: devEUI },
                data: { orderId: null }
            });

            // Logiraj spremembo
            if (device.senzorStocks.length > 0) {
                const stock = device.senzorStocks[0];
                await tx.inventoryLog.create({
                    data: {
                        itemType: "sensor",
                        itemName: stock.senzor.sensorName,
                        change: 1, // Nazaj v zalogo
                        reason: reason,
                        user: "System",
                        details: `DevEUI: ${devEUI} released from order ${device.orderId} (${device.order?.customerName})`,
                        senzorStockId: stock.id
                    }
                });
            }

            return updatedDevice;
        });

        return result;

    } catch (error) {
        console.error("Error releasing device from order:", error);
        throw new Error(error instanceof Error ? error.message : "Failed to release device from order");
    }
}

// =====================================
// NOVE HIERARHIČNE FUNKCIJE ZA PRODUCTION LIST
// =====================================

// Nivo 1: Grupiraj po DeviceType 
export async function getProductionHierarchy() {
    try {
        const deviceTypes = await prisma.productionList.groupBy({
            by: ['DeviceType'],
            where: {
                orderId: null, // Samo naprave, ki niso povezane z naročili
                DevEUI: { not: null }
            },
            _count: {
                id: true
            }
        });

        return deviceTypes.map(item => ({
            deviceType: item.DeviceType || 'Unknown',
            totalDevices: item._count.id
        }));
    } catch (error) {
        console.error('Error fetching device hierarchy:', error);
        return [];
    }
}

// Nivo 2: Grupiraj po frekvenci za določen DeviceType
export async function getProductionByFrequency(deviceType: string) {
    try {
        const frequencies = await prisma.productionList.groupBy({
            by: ['FrequencyRegion'],
            where: {
                DeviceType: deviceType,
                orderId: null,
                DevEUI: { not: null }
            },
            _count: {
                id: true
            }
        });

        return frequencies.map(item => ({
            frequency: item.FrequencyRegion || 'Unknown',
            count: item._count.id
        }));
    } catch (error) {
        console.error('Error fetching devices by frequency:', error);
        return [];
    }
}

// Nivo 3: Posamezne naprave po DevEUI
export async function getProductionDevices(deviceType: string, frequency: string) {
    try {
        const devices = await prisma.productionList.findMany({
            where: {
                DeviceType: deviceType,
                FrequencyRegion: frequency,
                orderId: null,
                DevEUI: { not: null }
            }
        });

        return devices.map(device => ({
            id: device.id,
            devEUI: device.DevEUI || 'Unknown',
            appEUI: device.AppEUI,
            deviceType: device.DeviceType,
            frequency: device.FrequencyRegion,
            hwVersion: device.HWVersion,
            fwVersion: device.FWVersion,
            isAvailable: true // Vsi so available ker orderId = null
        }));
    } catch (error) {
        console.error('Error fetching device details:', error);
        return [];
    }
}

/**
 * Izračunaj koliko senzorjev lahko sestavimo na podlagi razpoložljivih komponent
 */
export async function getSensorProductionCapacity() {
    try {
        const result = await prisma.$transaction(async (tx) => {
            // Dobi vse senzorje z njihovimi komponentnimi potrebami
            const sensors = await tx.senzor.findMany({
                include: {
                    components: {
                        include: {
                            component: {
                                include: {
                                    stockItems: {
                                        select: {
                                            quantity: true,
                                            location: true
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            });

            const productionCapacity = sensors.map(sensor => {
                // Za vsak senzor preveri, koliko lahko sestavimo
                let maxProducible = Infinity;
                const componentDetails: Array<{
                    name: string;
                    required: number;
                    available: number;
                    maxPossible: number;
                    isLimitingFactor: boolean;
                }> = [];

                sensor.components.forEach(sensorComponent => {
                    const component = sensorComponent.component;
                    const requiredQuantity = sensorComponent.requiredQuantity;

                    // Seštej vso razpoložljivo zalogo te komponente
                    const totalAvailable = component.stockItems.reduce(
                        (sum, stock) => sum + stock.quantity,
                        0
                    );

                    // Izračunaj koliko senzorjev lahko sestavimo s to komponento
                    const possibleWithThisComponent = Math.floor(totalAvailable / requiredQuantity);

                    componentDetails.push({
                        name: component.name,
                        required: requiredQuantity,
                        available: totalAvailable,
                        maxPossible: possibleWithThisComponent,
                        isLimitingFactor: false
                    });

                    // Omejitveni faktor je komponenta, ki omogoča najmanj proizvodnje
                    if (possibleWithThisComponent < maxProducible) {
                        maxProducible = possibleWithThisComponent;
                    }
                });

                // Označi omejitvene komponente
                componentDetails.forEach(comp => {
                    comp.isLimitingFactor = comp.maxPossible === maxProducible;
                });

                return {
                    sensorId: sensor.id,
                    sensorName: sensor.sensorName,
                    maxProducible: maxProducible === Infinity ? 0 : maxProducible,
                    componentDetails,
                    hasAllComponents: sensor.components.length > 0 && maxProducible > 0
                };
            });

            return productionCapacity;
        });

        return result;
    } catch (error) {
        console.error("Error calculating sensor production capacity:", error);
        throw new Error("Failed to calculate sensor production capacity");
    }
}

/**
 * Dobi povzetek proizvodnih zmogljivosti - skupno število senzorjev, ki jih lahko sestavimo
 */
export async function getProductionCapacitySummary() {
    try {
        const capacity = await getSensorProductionCapacity();

        const summary = {
            totalSensorTypes: capacity.length,
            sensorsWithComponents: capacity.filter(s => s.hasAllComponents).length,
            totalProducibleUnits: capacity.reduce((sum, s) => sum + s.maxProducible, 0),
            topLimitingComponents: {} as Record<string, number>
        };

        // Najdi najštevilčneje omejujoče komponente
        const limitingComponentCounts: Record<string, number> = {};
        capacity.forEach(sensor => {
            sensor.componentDetails.forEach(comp => {
                if (comp.isLimitingFactor) {
                    limitingComponentCounts[comp.name] = (limitingComponentCounts[comp.name] || 0) + 1;
                }
            });
        });

        summary.topLimitingComponents = limitingComponentCounts;

        return summary;
    } catch (error) {
        console.error("Error calculating production capacity summary:", error);
        throw new Error("Failed to calculate production capacity summary");
    }
}