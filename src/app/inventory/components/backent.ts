"use server";

import { prisma } from "~/server/DATABASE_ACTION/prisma";
import type {
  ComponentStockItem,
  LogEntry,
} from "~/app/inventory/components/InventoryManagement";
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
) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Check if dev_eui already exists
      const existingDevEui = await tx.productionList.findUnique({
        where: { DevEUI: dev_eui },
      });

      if (existingDevEui) {
        throw new Error(
          "The provided dev_eui already exists in the ProductionList table.",
        );
      }

      // 2. Get sensor information to determine DeviceType if not provided
      const sensorInfo = await tx.senzor.findUnique({
        where: { id: sensorId },
        select: { id: true, sensorName: true, familyId: true, productId: true },
      });

      if (!sensorInfo) {
        throw new Error(`Sensor with ID ${sensorId} not found`);
      }

      // 3. Determine DeviceType - use provided deviceType or generate from sensor info
      const finalDeviceType = sensorInfo.sensorName;

      // 4. Map frequency to FrequencyRegion format
      const mapFrequencyToRegion = (freq: string | null): string => {
        if (!freq) return "EU868";
        switch (freq) {
          case "868 MHz":
            return "EU868";
          case "915 MHz":
            return "US915";
          case "433 MHz":
            return "EU433";
          case "2.4 GHz":
            return "ISM2400";
          default:
            return "EU868";
        }
      };

      // 5. Create the dev_eui in productionList (orderId = null means it's in inventory)
      const productionDevice = await tx.productionList.create({
        data: {
          DevEUI: dev_eui,
          DeviceType: finalDeviceType,
          FrequencyRegion: mapFrequencyToRegion(frequency),
          orderId: null, // Null means it's available in inventory
        },
      });

      // 6. Log inventory addition
      await tx.inventoryLog.create({
        data: {
          itemType: "sensor",
          itemName: sensorInfo.sensorName,
          change: quantity,
          reason: "Proizvodnja",
          user: "Neznan uporabnik",
          details: `DevEUI: ${dev_eui} | DeviceType: ${finalDeviceType} | Batch: ${BN}`,
        },
      });

      return productionDevice;
    });

    return result;
  } catch (error) {
    console.error("Error adding sensor to inventory:", error);
    throw new Error("Failed to add sensor to inventory");
  }
}

// export async function showSensorInInventory() {
//   try {
//     const sensors = await prisma.senzorStock.findMany({
//       include: {
//         senzor: {
//           select: { id: true, sensorName: true },
//         },
//         logs: {
//           orderBy: { timestamp: "desc" },
//           take: 5,
//           select: {
//             timestamp: true,
//             change: true,
//             reason: true,
//             user: true,
//             details: true,
//           },
//         },
//       },
//     });

//     return sensors.map((stock) => ({
//       id: stock.id,
//       sensorId: stock.senzorId,
//       sensorName: stock.senzor.sensorName,
//       frequency: stock.frequency,
//       quantity: stock.quantity,
//       location: stock.location,
//       productionBatch: stock.productionBatch,
//       productionListDevEUI: stock.productionListDevEUI, // Dodano za DevEUI
//       lastUpdated: stock.lastUpdated,
//       recentLogs: stock.logs,
//     }));
//   } catch (error) {
//     console.error("Error fetching sensors in inventory:", error);
//     throw new Error("Failed to fetch sensors in inventory");
//   }
// }

export async function adjustSensorStock(
  devEUI: string,
  reason: string,
  assignToOrderId?: number | null,
) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Find the device in production list
      const device = await tx.productionList.findUnique({
        where: { DevEUI: devEUI },
      });

      if (!device) {
        throw new Error("Device not found");
      }

      // Update the order assignment
      const updatedDevice = await tx.productionList.update({
        where: { DevEUI: devEUI },
        data: {
          orderId: assignToOrderId,
        },
      });

      // Log the change
      const change = assignToOrderId ? -1 : 1; // -1 when assigned to order, +1 when released to inventory
      await tx.inventoryLog.create({
        data: {
          itemType: "sensor",
          itemName: device.DeviceType || "Unknown",
          change: change,
          reason: reason,
          user: "Neznan uporabnik",
          details: `DevEUI: ${devEUI} | ${assignToOrderId ? `Assigned to order ${assignToOrderId}` : "Released to inventory"}`,
        },
      });

      return {
        device: updatedDevice,
        previousOrderId: device.orderId,
        newOrderId: assignToOrderId,
        isNowInInventory: !assignToOrderId,
      };
    });

    return result;
  } catch (error) {
    console.error("Error updating sensor status:", error);
    throw new Error(
      error instanceof Error ? error.message : "Failed to update sensor status",
    );
  }
}

///// za kasneje

// export async function produceSensors(
//     sensorId: number,
//     quantity: number,
//     productionBatch: number,
//     location = "Proizvodna linija 1"
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
    const componentStocks = await prisma.componentStock.findMany({
      include: {
        component: {
          select: {
            id: true,
            name: true,
            Component_price: true,
            senzorComponent: {
              include: {
                senzor: {
                  select: { id: true, sensorName: true },
                },
              },
            },
          },
        },
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            filename: true,
            uploadDate: true,
            amount: true,
            supplier: true,
            componentStocks: {
              include: {
                component: {
                  select: { name: true },
                },
              },
            },
          },
        },
        logs: {
          orderBy: { timestamp: "desc" },
          take: 5,
          select: {
            timestamp: true,
            change: true,
            reason: true,
            user: true,
            details: true,
            invoice: {
              select: {
                id: true,
                invoiceNumber: true,
                filename: true,
                amount: true,
                supplier: true,
              },
            },
          },
        },
      },
    });

    // Also get all invoices to provide comprehensive invoice data
    const allInvoices = await prisma.invoice.findMany({
      include: {
        componentStocks: {
          include: {
            component: {
              select: { name: true },
            },
          },
        },
        logs: {
          select: {
            componentStockId: true,
            change: true,
            timestamp: true,
          },
        },
      },
    });

    return componentStocks.map((stock) => {
      // Get invoice number - prioritize direct invoice link, then most recent log invoice
      const invoiceNumber =
        stock.invoice?.invoiceNumber ||
        stock.logs.find((log) => log.invoice?.invoiceNumber)?.invoice
          ?.invoiceNumber;

      // Get file information - prioritize invoiceFileKey from ComponentStock, then filename from Invoice
      const invoiceFile =
        stock.invoiceFileKey ||
        stock.invoice?.filename ||
        stock.logs.find((log) => log.invoice?.filename)?.invoice?.filename;

      // Get comprehensive invoice data
      const relatedInvoice =
        stock.invoice || stock.logs.find((log) => log.invoice)?.invoice;

      // Find all related components on the same invoice
      const invoiceComponents = relatedInvoice
        ? allInvoices.find((inv) => inv.id === relatedInvoice.id)
            ?.componentStocks || []
        : [];

      return {
        id: stock.id,
        componentId: stock.componentId,
        name: stock.component.name ?? "Unknown",
        email: stock.email,
        quantity: stock.quantity,
        location: stock.location,
        supplier: stock.supplier,
        price: stock.component.Component_price,
        lastUpdated: stock.lastUpdated,
        recentLogs: stock.logs,
        invoiceNumber: invoiceNumber,
        invoiceFile: invoiceFile, // Add file information
        invoiceFileKey: stock.invoiceFileKey, // Add B2 file key
        sensorAssignments: stock.component.senzorComponent.map((sc) => ({
          sensorId: sc.senzorId,
          sensorName: sc.senzor?.sensorName ?? "Unnamed Sensor",
          requiredQuantity: sc.requiredQuantity,
        })),
        contactDetails: {
          email: stock.email ?? "",
          supplier: stock.supplier ?? "",
          phone: stock.phone ?? "",
        },
        // Enhanced invoice information
        invoiceDetails: relatedInvoice
          ? {
              id: relatedInvoice.id,
              invoiceNumber: relatedInvoice.invoiceNumber,
              totalAmount: relatedInvoice.amount || 0,
              supplier: relatedInvoice.supplier,
              uploadDate: new Date(), // Use current date since uploadDate field is missing from the type
              filename: relatedInvoice.filename,
              relatedComponents: invoiceComponents.map((cs) => ({
                componentName: cs.component.name,
                componentStockId: cs.id,
              })),
            }
          : null,
      };
    }) as ComponentStockItem[];
  } catch (error) {
    console.error("Error fetching components in inventory:", error);
    throw new Error("Failed to fetch components in inventory");
  }
}

export async function adjustComponentStock(
  stockId: number,
  quantity: number,
  reason: string,
  invoiceNumber: string | null = null,
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
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!currentStock) throw new Error("Component stock item not found");

      const newQuantity = currentStock.quantity + quantity;
      if (newQuantity < 0) throw new Error("Insufficient stock");

      const updatedStock = await tx.componentStock.update({
        where: { id: stockId },
        data: {
          quantity: newQuantity,
          lastUpdated: new Date(),
        },
      });

      // Create invoice record if provided and quantity increased
      let invoiceRecord = null;
      if (invoiceNumber) {
        invoiceRecord = await tx.invoice.upsert({
          where: { invoiceNumber },
          create: {
            invoiceNumber,
            amount: 0, // Amount not available in this function
            supplier: currentStock.supplier || "",
            uploadDate: new Date(),
            filename: null,
          },
          update: {
            supplier: currentStock.supplier || "",
          },
        });

        // Link the component stock to the invoice if created
        await tx.componentStock.update({
          where: { id: stockId },
          data: { invoiceId: invoiceRecord.id },
        });
      }

      await tx.inventoryLog.create({
        data: {
          itemType: "component",
          itemName: currentStock.component.name,
          change: quantity,
          reason,
          user: "Neznan uporabnik",
          details: invoiceNumber
            ? `Invoice: ${invoiceNumber}`
            : "No details provided",
          invoiceId: invoiceRecord?.id,
          componentStockId: stockId,
        },
      });

      return {
        ...updatedStock,
        component: currentStock.component,
      };
    });

    return result;
  } catch (error) {
    console.error("Error updating component stock:", error);
    throw new Error("Failed to update component stock");
  }
}

// New function for adjustments with full invoice support
export async function adjustComponentStockWithInvoice(
  stockId: number,
  quantity: number,
  reason: string,
  invoiceNumber: string | null = null,
  fileKey: string | null = null,
  price: number | null = null,
  supplier: string | null = null,
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
                    },
                  },
                },
              },
            },
          },
          invoice: {
            select: {
              id: true,
              invoiceNumber: true,
              amount: true,
              supplier: true,
              componentStocks: {
                include: {
                  component: {
                    select: { name: true },
                  },
                },
              },
            },
          },
        },
      });

      if (!currentStock) throw new Error("Component stock item not found");

      const newQuantity = currentStock.quantity + quantity;
      if (newQuantity < 0) throw new Error("Insufficient stock");

      // Check if invoice exists and get its data
      let existingInvoice = null;
      if (invoiceNumber) {
        existingInvoice = await tx.invoice.findUnique({
          where: { invoiceNumber },
          include: {
            componentStocks: {
              include: {
                component: {
                  select: { name: true },
                },
              },
            },
          },
        });
      }

      // Update stock quantity and file key if provided
      const updateData: {
        quantity: number;
        lastUpdated: Date;
        supplier?: string | null;
        invoiceFileKey?: string | null;
        invoiceId?: number | null;
      } = {
        quantity: newQuantity,
        lastUpdated: new Date(),
      };

      if (supplier !== undefined) updateData.supplier = supplier;
      if (fileKey !== undefined && fileKey !== null) {
        updateData.invoiceFileKey = fileKey;
        console.log("Setting invoiceFileKey to:", fileKey);
      }

      // Create invoice record if provided
      let invoiceRecord = null;
      if (invoiceNumber) {
        const totalInvoiceAmount =
          (existingInvoice?.amount || 0) + (price || 0) * Math.abs(quantity);

        // Debug: Log what's being saved to the database
        console.log("Creating/updating invoice with:", {
          invoiceNumber,
          amount: (price || 0) * Math.abs(quantity),
          supplier: supplier || currentStock.supplier || "",
          filename: fileKey,
        });

        invoiceRecord = await tx.invoice.upsert({
          where: { invoiceNumber },
          create: {
            invoiceNumber,
            amount: (price || 0) * Math.abs(quantity),
            supplier: supplier || currentStock.supplier || "",
            uploadDate: new Date(),
            filename: fileKey || null, // Store the full B2 file path directly
          },
          update: {
            amount: totalInvoiceAmount,
            supplier:
              supplier ||
              existingInvoice?.supplier ||
              currentStock.supplier ||
              "",
            filename: fileKey || existingInvoice?.filename, // Store the full B2 file path directly
          },
        });

        console.log("Invoice record created/updated:", {
          id: invoiceRecord.id,
          invoiceNumber: invoiceRecord.invoiceNumber,
          filename: invoiceRecord.filename,
          amount: invoiceRecord.amount,
        });

        updateData.invoiceId = invoiceRecord.id;
      }

      const updatedStock = await tx.componentStock.update({
        where: { id: stockId },
        data: updateData,
      });

      // Create detailed log entry with invoice information - always log when invoice or other data changes
      const invoiceDetails = existingInvoice
        ? `Existing invoice components: ${existingInvoice.componentStocks.map((cs) => cs.component.name).join(", ")} | `
        : "";

      const hasInvoiceUpdate =
        invoiceNumber ||
        fileKey ||
        supplier !== undefined ||
        price !== undefined;
      const shouldLog = quantity !== 0 || hasInvoiceUpdate;

      if (shouldLog) {
        const logDetails = [];

        if (quantity !== 0) {
          logDetails.push(
            `Quantity change: ${quantity > 0 ? "+" : ""}${quantity}`,
          );
        }

        if (invoiceNumber) {
          logDetails.push(`Invoice: ${invoiceNumber}`);
          if (invoiceDetails) {
            logDetails.push(invoiceDetails.trim());
          }
        }

        if (price !== undefined) {
          logDetails.push(`Unit price: ${price ? `€${price}` : "N/A"}`);
        }

        if (invoiceRecord) {
          logDetails.push(
            `Total invoice amount: €${invoiceRecord.amount || 0}`,
          );
        }

        if (supplier !== undefined) {
          logDetails.push(`Supplier: ${supplier || "N/A"}`);
        }

        if (fileKey) {
          logDetails.push(`File: ${fileKey}`);
        }

        await tx.inventoryLog.create({
          data: {
            itemType: "component",
            itemName: currentStock.component.name,
            change: quantity,
            reason: quantity !== 0 ? reason : `Invoice update: ${reason}`,
            user: "System",
            details: logDetails.join(" | "),
            invoiceId: invoiceRecord?.id,
            componentStockId: stockId,
          },
        });
      }

      return {
        ...updatedStock,
        component: currentStock.component,
        invoice: invoiceRecord,
        existingInvoiceData: existingInvoice,
      };
    });

    return result;
  } catch (error) {
    console.error("Error adjusting component stock:", error);
    throw new Error("Failed to adjust component stock");
  }
}

export async function addComponentToInventory(
  componentId: number,
  quantity: number,
  location: string,
  email: string | null = null,
  supplier: string | null = null,
  invoiceNumber: string | null = null,
  price: number | null = null,
  phone: string | null = null,
  sensorAssignments: { sensorId: number; requiredQuantity: number }[] = [],
  fileKey: string | null = null, // Add file key for B2 storage
) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Check if invoice already exists and get its data
      let existingInvoice = null;
      if (invoiceNumber) {
        existingInvoice = await tx.invoice.findUnique({
          where: { invoiceNumber },
          include: {
            componentStocks: {
              include: {
                component: {
                  select: { name: true },
                },
              },
            },
          },
        });
      }

      // Create invoice record if provided and doesn't exist
      let invoiceRecord = null;
      if (invoiceNumber) {
        invoiceRecord = await tx.invoice.upsert({
          where: { invoiceNumber },
          create: {
            invoiceNumber,
            amount: (price || 0) * quantity,
            supplier: supplier || "",
            uploadDate: new Date(),
            filename: fileKey || null, // Store the full B2 file path directly
          },
          update: {
            // Update amount by adding new component cost to existing amount
            amount: (existingInvoice?.amount || 0) + (price || 0) * quantity,
            supplier: supplier || existingInvoice?.supplier || "",
            filename: fileKey || existingInvoice?.filename, // Store the full B2 file path directly
          },
        });
      }

      // Create component stock
      console.log(
        "addComponentToInventory: Creating component stock with invoiceFileKey:",
        fileKey,
      );
      const componentStock = await tx.componentStock.create({
        data: {
          componentId,
          quantity,
          location,
          email,
          supplier,
          phone,
          invoiceFileKey: fileKey, // Store the B2 file key
          invoiceId: invoiceRecord?.id, // Link to invoice if created
        },
      });
      console.log(
        "Component stock created with invoiceFileKey:",
        componentStock.invoiceFileKey,
      );

      // Update the component price if provided
      if (price !== null) {
        await tx.component.update({
          where: { id: componentId },
          data: { Component_price: price },
        });
      }

      // Handle sensor assignments
      if (sensorAssignments.length > 0) {
        // Remove existing assignments for this component
        await tx.senzorComponent.deleteMany({
          where: { componentId },
        });

        // Add new assignments
        for (const assignment of sensorAssignments) {
          await tx.senzorComponent.create({
            data: {
              componentId,
              senzorId: assignment.sensorId,
              requiredQuantity: assignment.requiredQuantity,
            },
          });
        }
      }

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
                  sensorName: true,
                },
              },
            },
          },
        },
      });

      // Create inventory log with invoice reference
      await tx.inventoryLog.create({
        data: {
          itemType: "component",
          itemName: component?.name ?? "Unknown",
          change: quantity,
          reason: "Added to inventory",
          user: "System",
          details: invoiceNumber
            ? `Component ID: ${componentId} | Invoice: ${invoiceNumber} | Total invoice amount: €${invoiceRecord?.amount || 0} | Sensor assignments: ${sensorAssignments.length}${fileKey ? ` | File: ${fileKey}` : ""}`
            : `Component ID: ${componentId} | Sensor assignments: ${sensorAssignments.length}${fileKey ? ` | File: ${fileKey}` : ""}`,
          invoiceId: invoiceRecord?.id,
          componentStockId: componentStock.id,
        },
      });

      return {
        ...componentStock,
        component,
        invoice: invoiceRecord,
        existingInvoiceData: existingInvoice,
        fileKey,
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
  phone?: string,
  price?: number,
  fileKey?: string | null, // Add file key for B2 storage
) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const currentStock = await tx.componentStock.findUnique({
        where: { id: stockId },
        include: {
          component: { select: { name: true } },
        },
      });

      if (!currentStock) {
        throw new Error("Component stock not found");
      }

      const quantityChange = newQuantity - currentStock.quantity;

      // Prepare update data
      const updateData: Partial<{
        quantity: number;
        lastUpdated: Date;
        location?: string;
        email?: string;
        supplier?: string;
        phone?: string;
        invoiceFileKey?: string;
      }> = {
        quantity: newQuantity,
        lastUpdated: new Date(),
      };

      if (location !== undefined) updateData.location = location;
      if (email !== undefined) updateData.email = email;
      if (supplier !== undefined) updateData.supplier = supplier;
      if (phone !== undefined) updateData.phone = phone;
      if (fileKey !== undefined && fileKey !== null) {
        updateData.invoiceFileKey = fileKey;
        console.log(
          "updateComponentStock: Setting invoiceFileKey to:",
          fileKey,
        );
      }

      await tx.componentStock.update({
        where: { id: stockId },
        data: updateData,
      });

      // Update component price if provided
      if (price !== undefined) {
        await tx.component.update({
          where: { id: currentStock.componentId },
          data: { Component_price: price },
        });
      }

      // Create invoice record if provided
      let invoiceRecord = null;
      if (invoiceNumber) {
        invoiceRecord = await tx.invoice.upsert({
          where: { invoiceNumber },
          create: {
            invoiceNumber,
            amount: (price || 0) * Math.abs(quantityChange),
            supplier: supplier || currentStock.supplier || "",
            uploadDate: new Date(),
            filename: fileKey || null, // Store the full B2 file path
          },
          update: {
            amount: (price || 0) * Math.abs(quantityChange),
            supplier: supplier || currentStock.supplier || "",
            filename: fileKey || null, // Store the full B2 file path
          },
        });

        // Link the component stock to the invoice if created
        await tx.componentStock.update({
          where: { id: stockId },
          data: { invoiceId: invoiceRecord.id },
        });
      }

      // Create detailed log entry - always log when invoice information is provided
      const hasInvoiceUpdate =
        invoiceNumber ||
        fileKey ||
        supplier !== undefined ||
        price !== undefined;
      const shouldLog = quantityChange !== 0 || hasInvoiceUpdate;

      if (shouldLog) {
        const logDetails = [];

        if (quantityChange !== 0) {
          logDetails.push(
            `Quantity change: ${quantityChange > 0 ? "+" : ""}${quantityChange}`,
          );
        }

        if (invoiceNumber) {
          logDetails.push(`Invoice: ${invoiceNumber}`);
        }

        if (price !== undefined) {
          logDetails.push(`Price: ${price ? `€${price}` : "N/A"}`);
        }

        if (supplier !== undefined) {
          logDetails.push(`Supplier: ${supplier || "N/A"}`);
        }

        if (fileKey) {
          logDetails.push(`File: ${fileKey}`);
        }

        await tx.inventoryLog.create({
          data: {
            itemType: "component",
            itemName: currentStock.component.name,
            change: quantityChange,
            reason: quantityChange !== 0 ? reason : `Invoice update: ${reason}`,
            user: "System",
            details: logDetails.join(" | "),
            invoiceId: invoiceRecord?.id,
            componentStockId: stockId,
          },
        });
      }

      const updated = await tx.componentStock.findUnique({
        where: { id: stockId },
        include: {
          component: {
            select: {
              id: true,
              name: true,
              Component_price: true,
              senzorComponent: {
                include: {
                  senzor: {
                    select: { id: true, sensorName: true },
                  },
                },
              },
            },
          },
        },
      });

      return updated;
    });

    return result;
  } catch (error) {
    throw new Error("Failed to update component stock", error as Error);
  }
}
export async function updateComponentSensorAssignments(
  componentId: number,
  assignments: { sensorId: number; requiredQuantity: number }[],
) {
  try {
    // Najprej izbriši vse obstoječe povezave za to komponento
    await prisma.senzorComponent.deleteMany({
      where: { componentId },
    });

    // Nato dodaj nove povezave
    for (const assignment of assignments) {
      await prisma.senzorComponent.create({
        data: {
          componentId,
          senzorId: assignment.sensorId,
          requiredQuantity: assignment.requiredQuantity,
        },
      });
    }
    return true;
  } catch (error) {
    console.error("Error updating sensor assignments:", error);
    throw new Error("Failed to update sensor assignments");
  }
}

export async function deleteSensorFromInventory(devEUI: string) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Check if device exists and is not assigned to an order
      const device = await tx.productionList.findUnique({
        where: { DevEUI: devEUI },
      });

      if (!device) {
        throw new Error("Device not found");
      }

      if (device.orderId) {
        throw new Error("Cannot delete device that is assigned to an order");
      }

      // Delete the device
      await tx.productionList.delete({
        where: { DevEUI: devEUI },
      });

      // Log the deletion
      await tx.inventoryLog.create({
        data: {
          itemType: "sensor",
          itemName: device.DeviceType || "Unknown",
          change: -1,
          reason: "Deleted from inventory",
          user: "System",
          details: `DevEUI: ${devEUI} deleted from inventory`,
        },
      });

      return device;
    });

    return result;
  } catch (error) {
    console.error("Error deleting sensor from inventory:", error);
    throw new Error("Failed to delete sensor from inventory");
  }
}

export async function deleteComponentFromInventory(stockId: number) {
  try {
    await prisma.componentStock.delete({
      where: { id: stockId },
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
            invoiceNumber: true,
          },
        },
      },
      orderBy: {
        timestamp: "desc",
      },
    });
    return result.map((log) => ({
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
      componentStockId: log.componentStockId ?? null,
    })) as LogEntry[];
  } catch (error) {
    console.error("Error deleting component from inventory:", error);
    throw new Error("Failed to delete component from inventory");
  }
}

export async function getAllComponents() {
  try {
    return await prisma.component.findMany({
      select: { id: true, name: true },
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
 * Hierarhična struktura senzorjev po tipih in frekvencah (production table based)
 */
export async function getSensorHierarchy() {
  try {
    const devices = await prisma.productionList.findMany({
      where: {
        orderId: null, // Only devices not assigned to orders (in inventory)
        DevEUI: { not: null },
      },
    });

    // Group by DeviceType (sensor type)
    const sensorGroups = new Map();

    devices.forEach((device) => {
      const deviceType = device.DeviceType || "Unknown";
      const sensorKey = deviceType;

      if (!sensorGroups.has(sensorKey)) {
        sensorGroups.set(sensorKey, {
          deviceType: deviceType,
          totalQuantity: 0,
          frequencies: new Map(),
        });
      }

      const group = sensorGroups.get(sensorKey);
      group.totalQuantity += 1;

      // Group by frequency
      const frequency = device.FrequencyRegion || "EU868";
      if (!group.frequencies.has(frequency)) {
        group.frequencies.set(frequency, {
          frequency,
          totalQuantity: 0,
          devices: [],
        });
      }

      const freqGroup = group.frequencies.get(frequency);
      freqGroup.totalQuantity += 1;
      freqGroup.devices.push({
        id: device.id,
        devEUI: device.DevEUI,
        deviceType: device.DeviceType,
        frequency: device.FrequencyRegion,
        appEUI: device.AppEUI,
        appKey: device.AppKey,
        hwVersion: device.HWVersion,
        fwVersion: device.FWVersion,
        isAvailable: true, // All are available since orderId is null
      });
    });

    // Convert to array format
    return Array.from(sensorGroups.values()).map((group) => ({
      ...group,
      frequencies: Array.from(group.frequencies.values()),
    }));
  } catch (error) {
    console.error("Error fetching sensor hierarchy:", error);
    throw new Error("Failed to fetch sensor hierarchy");
  }
}

/**
 * Dobi senzorje po določeni frekvenci in tipu
 */
export async function getSensorsByFrequency(
  deviceType: string,
  frequency: string,
) {
  try {
    const devices = await prisma.productionList.findMany({
      where: {
        DeviceType: deviceType,
        FrequencyRegion: frequency,
        orderId: null, // Only devices in inventory
        DevEUI: { not: null },
      },
    });

    return devices.map((device) => ({
      id: device.id,
      devEUI: device.DevEUI,
      deviceType: device.DeviceType,
      frequency: device.FrequencyRegion,
      appEUI: device.AppEUI,
      appKey: device.AppKey,
      hwVersion: device.HWVersion,
      fwVersion: device.FWVersion,
      isAvailable: true,
    }));
  } catch (error) {
    console.error("Error fetching sensors by frequency:", error);
    throw new Error("Failed to fetch sensors by frequency");
  }
}

export async function getSensorQuantitySummary() {
  try {
    const summary = await prisma.productionList.groupBy({
      by: ["DeviceType"],
      where: {
        orderId: null, // Only devices in inventory
        DevEUI: { not: null },
      },
      _count: {
        id: true,
      },
    });

    return summary.map((item) => ({
      deviceType: item.DeviceType || "Unknown",
      totalQuantity: item._count.id || 0,
      deviceCount: item._count.id || 0,
    }));
  } catch (error) {
    console.error("Error fetching sensor quantity summary:", error);
    throw new Error("Failed to fetch sensor quantity summary");
  }
}

/**
 * Dobi povzetek količin po frekvencah za določen tip senzorja
 */
export async function getSensorFrequencySummary(deviceType: string) {
  try {
    const summary = await prisma.productionList.groupBy({
      by: ["FrequencyRegion"],
      where: {
        DeviceType: deviceType,
        orderId: null, // Only devices in inventory
        DevEUI: { not: null },
      },
      _count: {
        id: true,
      },
    });

    return summary.map((item) => ({
      frequency: item.FrequencyRegion || "EU868",
      totalQuantity: item._count.id || 0,
      deviceCount: item._count.id || 0,
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
      where: { DevEUI: devEUI },
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
    const device = await prisma.productionList.findUnique({
      where: { DevEUI: devEUI },
      include: {
        order: {
          select: { id: true, customerName: true, orderDate: true },
        },
      },
    });

    if (!device) {
      throw new Error("Device not found");
    }

    // Get recent logs for this device
    const recentLogs = await prisma.inventoryLog.findMany({
      where: {
        itemType: "sensor",
        details: { contains: devEUI },
      },
      orderBy: { timestamp: "desc" },
      take: 10,
      select: {
        timestamp: true,
        change: true,
        reason: true,
        user: true,
        details: true,
      },
    });

    return {
      id: device.id,
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
      isAvailable: !device.orderId,
      order: device.order,
      recentLogs: recentLogs,
    };
  } catch (error) {
    console.error("Error fetching sensor by DevEUI:", error);
    throw new Error("Failed to fetch sensor by DevEUI");
  }
}

/**
 * Masovno posodobi status senzorjev (assign/release from orders)
 */
export async function bulkUpdateSensorStock(
  updates: Array<{
    devEUI: string;
    orderId: number | null;
    reason: string;
  }>,
) {
  try {
    const results = await prisma.$transaction(async (tx) => {
      const updatePromises = updates.map(async (update) => {
        const currentDevice = await tx.productionList.findUnique({
          where: { DevEUI: update.devEUI },
        });

        if (!currentDevice) {
          throw new Error(`Device ${update.devEUI} not found`);
        }

        const updatedDevice = await tx.productionList.update({
          where: { DevEUI: update.devEUI },
          data: {
            orderId: update.orderId,
          },
        });

        const change = update.orderId ? -1 : 1; // -1 when assigned, +1 when released
        await tx.inventoryLog.create({
          data: {
            itemType: "sensor",
            itemName: currentDevice.DeviceType || "Unknown",
            change: change,
            reason: update.reason,
            user: "Bulk Update",
            details: `DevEUI: ${update.devEUI} | ${update.orderId ? `Assigned to order ${update.orderId}` : "Released to inventory"}`,
          },
        });

        return updatedDevice;
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
  deviceType: string,
  frequency: string,
  dev_eui: string,
  appEUI?: string,
  appKey?: string,
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
      }

      // 2. Ustvari napravo v ProductionList
      const device = await tx.productionList.create({
        data: {
          DevEUI: dev_eui,
          DeviceType: deviceType,
          FrequencyRegion: frequency,
          AppEUI: appEUI || null,
          AppKey: appKey || null,
          orderId: null, // Null means it's available in inventory
        },
      });

      // 3. Logiraj
      await tx.inventoryLog.create({
        data: {
          itemType: "sensor",
          itemName: deviceType,
          change: 1,
          reason: "Dodajanje v zalogo",
          user: "System",
          details: `DevEUI: ${dev_eui} | DeviceType: ${deviceType} | Frequency: ${frequency}`,
        },
      });

      return device;
    });

    return result;
  } catch (error) {
    console.error("Error adding sensor to inventory:", error);
    throw new Error(
      error instanceof Error
        ? error.message
        : "Failed to add sensor to inventory",
    );
  }
}

/**
 * Prenesi senzor iz enega naročila v drugo ali v zalogo
 */
export async function transferSensorLocation(
  devEUI: string,
  newOrderId: number | null,
  reason: string,
) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const currentDevice = await tx.productionList.findUnique({
        where: { DevEUI: devEUI },
      });

      if (!currentDevice) {
        throw new Error("Device not found");
      }

      const updatedDevice = await tx.productionList.update({
        where: { DevEUI: devEUI },
        data: {
          orderId: newOrderId,
        },
      });

      await tx.inventoryLog.create({
        data: {
          itemType: "sensor",
          itemName: currentDevice.DeviceType || "Unknown",
          change: 0, // No quantity change, just transfer
          reason: `Transfer: ${reason}`,
          user: "System",
          details: `DevEUI: ${devEUI} | ${currentDevice.orderId ? `Order ${currentDevice.orderId}` : "Inventory"} → ${newOrderId ? `Order ${newOrderId}` : "Inventory"}`,
        },
      });

      return updatedDevice;
    });

    return result;
  } catch (error) {
    console.error("Error transferring sensor:", error);
    throw new Error("Failed to transfer sensor");
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
  return devEUI.match(/.{1,2}/g)?.join(":") || devEUI;
}

/**
 * Statistike zaloge senzorjev
 */
export async function getSensorStockStatistics() {
  try {
    const stats = await prisma.$transaction(async (tx) => {
      // Skupno število naprav v zalogi
      const totalInInventory = await tx.productionList.count({
        where: {
          orderId: null,
          DevEUI: { not: null },
        },
      });

      // Število naprav po tipih
      const deviceTypes = await tx.productionList.groupBy({
        by: ["DeviceType"],
        where: {
          orderId: null,
          DevEUI: { not: null },
        },
        _count: { id: true },
      });

      // Število naprav po frekvencah
      const frequencies = await tx.productionList.groupBy({
        by: ["FrequencyRegion"],
        where: {
          orderId: null,
          DevEUI: { not: null },
        },
        _count: { id: true },
      });

      // Najnovejši dodatki v zalogo
      const recentAdditions = await tx.inventoryLog.findMany({
        where: {
          itemType: "sensor",
          change: { gt: 0 },
        },
        orderBy: { timestamp: "desc" },
        take: 5,
        select: {
          itemName: true,
          change: true,
          timestamp: true,
          reason: true,
        },
      });

      return {
        totalQuantity: totalInInventory,
        deviceTypeCount: deviceTypes.length,
        frequencyDistribution: frequencies.map((f) => ({
          frequency: f.FrequencyRegion || "EU868",
          quantity: f._count.id || 0,
        })),
        deviceTypeDistribution: deviceTypes.map((d) => ({
          deviceType: d.DeviceType || "Unknown",
          quantity: d._count.id || 0,
        })),
        recentAdditions,
      };
    });

    return stats;
  } catch (error) {
    console.error("Error fetching sensor statistics:", error);
    throw new Error("Failed to fetch sensor statistics");
  }
}

/**
 * Poišči tipe senzorjev z nizko zalogo
 */
export async function getLowStockSensors(threshold: number = 5) {
  try {
    const deviceTypeCounts = await prisma.productionList.groupBy({
      by: ["DeviceType"],
      where: {
        orderId: null, // Only devices in inventory
        DevEUI: { not: null },
      },
      _count: {
        id: true,
      },
      having: {
        id: {
          _count: {
            lte: threshold,
          },
        },
      },
    });

    return deviceTypeCounts.map((item) => ({
      deviceType: item.DeviceType || "Unknown",
      availableCount: item._count.id,
      threshold: threshold,
      isLowStock: item._count.id <= threshold,
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
    // Get all ProductionList records that are NOT linked to orders
    const availableDevices = await prisma.productionList.findMany({
      where: {
        orderId: null, // Not linked to order = in inventory
        DevEUI: { not: null }, // Has DevEUI
      },
    });

    // Group by DeviceType (level 1)
    const deviceGroups = new Map<
      string,
      {
        deviceType: string;
        totalDevices: number;
        frequencies: Map<
          string,
          {
            frequency: string;
            totalDevices: number;
            devices: {
              id: number;
              devEUI: string | null;
              deviceType: string | null;
              frequency: string | null;
              appEUI: string | null;
              appKey: string | null;
              hwVersion: string | null;
              fwVersion: string | null;
            }[];
          }
        >;
      }
    >();

    availableDevices.forEach((device) => {
      const deviceType = device.DeviceType || "Unknown";
      const frequency = device.FrequencyRegion || "EU868";

      // Initialize group for DeviceType
      if (!deviceGroups.has(deviceType)) {
        deviceGroups.set(deviceType, {
          deviceType,
          totalDevices: 0,
          frequencies: new Map(),
        });
      }

      const deviceGroup = deviceGroups.get(deviceType)!;
      deviceGroup.totalDevices += 1;

      // Initialize group for frequency
      if (!deviceGroup.frequencies.has(frequency)) {
        deviceGroup.frequencies.set(frequency, {
          frequency,
          totalDevices: 0,
          devices: [],
        });
      }

      const freqGroup = deviceGroup.frequencies.get(frequency)!;
      freqGroup.totalDevices += 1;

      // Add device data
      freqGroup.devices.push({
        id: device.id,
        devEUI: device.DevEUI,
        deviceType: device.DeviceType,
        frequency: device.FrequencyRegion,
        appEUI: device.AppEUI,
        appKey: device.AppKey,
        hwVersion: device.HWVersion,
        fwVersion: device.FWVersion,
      });
    });

    // Convert to array format
    return Array.from(deviceGroups.values()).map((group) => ({
      deviceType: group.deviceType,
      totalDevices: group.totalDevices,
      frequencies: Array.from(group.frequencies.values()),
    }));
  } catch (error) {
    console.error("Error fetching inventory sensor hierarchy:", error);
    throw new Error("Failed to fetch inventory sensor hierarchy");
  }
}

/**
 * Dobi senzorje po DeviceType in frekvenci (za nivo 2)
 */
export async function getDevicesByTypeAndFrequency(
  deviceType: string,
  frequency: string,
) {
  try {
    const devices = await prisma.productionList.findMany({
      where: {
        orderId: null, // Not linked to order
        DeviceType: deviceType,
        FrequencyRegion: frequency,
        DevEUI: { not: null },
      },
    });

    return devices.map((device) => ({
      id: device.id,
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
      isAvailable: true,
    }));
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
        orderId: null, // Not linked to order
        DeviceType: deviceType,
        DevEUI: { not: null },
      },
    });

    // Group by frequencies
    const frequencyGroups = new Map<string, typeof devices>();

    devices.forEach((device) => {
      const frequency = device.FrequencyRegion || "EU868";

      if (!frequencyGroups.has(frequency)) {
        frequencyGroups.set(frequency, []);
      }

      frequencyGroups.get(frequency)!.push(device);
    });

    return Array.from(frequencyGroups.entries()).map(
      ([frequency, devices]) => ({
        frequency,
        totalDevices: devices.length,
        devices: devices.map((device) => ({
          id: device.id,
          devEUI: device.DevEUI,
          deviceType: device.DeviceType,
          frequency: device.FrequencyRegion,
          appEUI: device.AppEUI,
          appKey: device.AppKey,
          hwVersion: device.HWVersion,
          fwVersion: device.FWVersion,
          isAvailable: true,
        })),
      }),
    );
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
            quantity: true,
          },
        },
      },
    });

    if (!device) {
      throw new Error("Device not found");
    }

    // Get recent logs for this device
    const recentLogs = await prisma.inventoryLog.findMany({
      where: {
        itemType: "sensor",
        details: { contains: devEUI },
      },
      orderBy: { timestamp: "desc" },
      take: 10,
      select: {
        timestamp: true,
        change: true,
        reason: true,
        user: true,
        details: true,
      },
    });

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
      isAvailable: !device.orderId, // Available if not assigned to order
      order: device.order, // If linked to order
      recentLogs: recentLogs,
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
      by: ["DeviceType"],
      where: {
        orderId: null, // Not linked to order
        DevEUI: { not: null },
      },
      _count: {
        id: true,
      },
    });

    // Additional statistics by frequencies
    const frequencyStats = await prisma.productionList.groupBy({
      by: ["DeviceType", "FrequencyRegion"],
      where: {
        orderId: null,
        DevEUI: { not: null },
      },
      _count: {
        id: true,
      },
    });

    return {
      deviceTypes: summary.map((item) => ({
        deviceType: item.DeviceType || "Unknown",
        totalDevices: item._count.id,
      })),
      frequencyBreakdown: frequencyStats.map((item) => ({
        deviceType: item.DeviceType || "Unknown",
        frequency: item.FrequencyRegion || "EU868",
        count: item._count.id,
      })),
    };
  } catch (error) {
    console.error("Error fetching available devices summary:", error);
    throw new Error("Failed to fetch available devices summary");
  }
}

/**
 * Premakni napravo iz zaloge v naročilo
 */
export async function assignDeviceToOrder(
  devEUI: string,
  orderId: number,
  reason: string = "Assigned to order",
) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Check if device exists and is not already assigned
      const device = await tx.productionList.findUnique({
        where: { DevEUI: devEUI },
      });

      if (!device) {
        throw new Error("Device not found");
      }

      if (device.orderId) {
        throw new Error("Device is already assigned to an order");
      }

      // Assign device to order
      const updatedDevice = await tx.productionList.update({
        where: { DevEUI: devEUI },
        data: { orderId: orderId },
      });

      // Log the change
      await tx.inventoryLog.create({
        data: {
          itemType: "sensor",
          itemName: device.DeviceType || "Unknown",
          change: -1, // Out of inventory
          reason: reason,
          user: "System",
          details: `DevEUI: ${devEUI} assigned to order ${orderId}`,
        },
      });

      return updatedDevice;
    });

    return result;
  } catch (error) {
    console.error("Error assigning device to order:", error);
    throw new Error(
      error instanceof Error
        ? error.message
        : "Failed to assign device to order",
    );
  }
}

/**
 * Sprosti napravo iz naročila nazaj v zalogo
 */
export async function releaseDeviceFromOrder(
  devEUI: string,
  reason: string = "Released from order",
) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const device = await tx.productionList.findUnique({
        where: { DevEUI: devEUI },
        include: {
          order: { select: { id: true, customerName: true } },
        },
      });

      if (!device) {
        throw new Error("Device not found");
      }

      if (!device.orderId) {
        throw new Error("Device is not assigned to any order");
      }

      // Release device
      const updatedDevice = await tx.productionList.update({
        where: { DevEUI: devEUI },
        data: { orderId: null },
      });

      // Log the change
      await tx.inventoryLog.create({
        data: {
          itemType: "sensor",
          itemName: device.DeviceType || "Unknown",
          change: 1, // Back to inventory
          reason: reason,
          user: "System",
          details: `DevEUI: ${devEUI} released from order ${device.orderId} (${device.order?.customerName})`,
        },
      });

      return updatedDevice;
    });

    return result;
  } catch (error) {
    console.error("Error releasing device from order:", error);
    throw new Error(
      error instanceof Error
        ? error.message
        : "Failed to release device from order",
    );
  }
}

// =====================================
// NOVE HIERARHIČNE FUNKCIJE ZA PRODUCTION LIST
// =====================================

// Nivo 1: Grupiraj po DeviceType
export async function getProductionHierarchy() {
  try {
    const deviceTypes = await prisma.productionList.groupBy({
      by: ["DeviceType"],
      where: {
        orderId: null, // Samo naprave, ki niso povezane z naročili
        DevEUI: { not: null },
      },
      _count: {
        id: true,
      },
    });

    return deviceTypes.map((item) => ({
      deviceType: item.DeviceType || "Unknown",
      totalDevices: item._count.id,
    }));
  } catch (error) {
    console.error("Error fetching device hierarchy:", error);
    return [];
  }
}

// Nivo 2: Grupiraj po frekvenci za določen DeviceType
export async function getProductionByFrequency(deviceType: string) {
  try {
    const frequencies = await prisma.productionList.groupBy({
      by: ["FrequencyRegion"],
      where: {
        DeviceType: deviceType,
        orderId: null,
        DevEUI: { not: null },
      },
      _count: {
        id: true,
      },
    });

    return frequencies.map((item) => ({
      frequency: item.FrequencyRegion || "Unknown",
      count: item._count.id,
    }));
  } catch (error) {
    console.error("Error fetching devices by frequency:", error);
    return [];
  }
}

// Nivo 3: Posamezne naprave po DevEUI
export async function getProductionDevices(
  deviceType: string,
  frequency: string,
) {
  try {
    const devices = await prisma.productionList.findMany({
      where: {
        DeviceType: deviceType,
        FrequencyRegion: frequency,
        orderId: null,
        DevEUI: { not: null },
      },
    });

    return devices.map((device) => ({
      id: device.id,
      devEUI: device.DevEUI || "Unknown",
      appEUI: device.AppEUI,
      deviceType: device.DeviceType,
      frequency: device.FrequencyRegion,
      hwVersion: device.HWVersion,
      fwVersion: device.FWVersion,
      isAvailable: true, // Vsi so available ker orderId = null
    }));
  } catch (error) {
    console.error("Error fetching device details:", error);
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
                      location: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      const productionCapacity = sensors.map((sensor) => {
        // Za vsak senzor preveri, koliko lahko sestavimo
        let maxProducible = Infinity;
        const componentDetails: Array<{
          name: string;
          required: number;
          available: number;
          maxPossible: number;
          isLimitingFactor: boolean;
        }> = [];

        sensor.components.forEach((sensorComponent) => {
          const component = sensorComponent.component;
          const requiredQuantity = sensorComponent.requiredQuantity;

          // Seštej vso razpoložljivo zalogo te komponente
          const totalAvailable = component.stockItems.reduce(
            (sum, stock) => sum + stock.quantity,
            0,
          );

          // Izračunaj koliko senzorjev lahko sestavimo s to komponento
          const possibleWithThisComponent = Math.floor(
            totalAvailable / requiredQuantity,
          );

          componentDetails.push({
            name: component.name,
            required: requiredQuantity,
            available: totalAvailable,
            maxPossible: possibleWithThisComponent,
            isLimitingFactor: false,
          });

          // Omejitveni faktor je komponenta, ki omogoča najmanj proizvodnje
          if (possibleWithThisComponent < maxProducible) {
            maxProducible = possibleWithThisComponent;
          }
        });

        // Označi omejitvene komponente
        componentDetails.forEach((comp) => {
          comp.isLimitingFactor = comp.maxPossible === maxProducible;
        });

        return {
          sensorId: sensor.id,
          sensorName: sensor.sensorName,
          maxProducible: maxProducible === Infinity ? 0 : maxProducible,
          componentDetails,
          hasAllComponents: sensor.components.length > 0 && maxProducible > 0,
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
      sensorsWithComponents: capacity.filter((s) => s.hasAllComponents).length,
      totalProducibleUnits: capacity.reduce(
        (sum, s) => sum + s.maxProducible,
        0,
      ),
      topLimitingComponents: {} as Record<string, number>,
    };

    // Najdi najštevilčneje omejujoče komponente
    const limitingComponentCounts: Record<string, number> = {};
    capacity.forEach((sensor) => {
      sensor.componentDetails.forEach((comp) => {
        if (comp.isLimitingFactor) {
          limitingComponentCounts[comp.name] =
            (limitingComponentCounts[comp.name] || 0) + 1;
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

/**
 * Get detailed sensor inventory for email reports - based on ProductionList
 */
export async function getDetailedSensorInventory() {
  try {
    const devices = await prisma.productionList.findMany({
      where: {
        orderId: null, // Only available devices (not assigned to orders)
        DevEUI: { not: null }, // Must have DevEUI
      },
      include: {
        order: {
          select: { senzorId: true },
        },
      },
    });

    // Group by device type and frequency
    const deviceGroups = new Map();

    devices.forEach((device) => {
      const deviceType = device.DeviceType || "Unknown";

      if (!deviceGroups.has(deviceType)) {
        deviceGroups.set(deviceType, {
          sensorName: deviceType,
          totalQuantity: 0,
          frequencies: new Map(),
        });
      }

      const group = deviceGroups.get(deviceType);
      group.totalQuantity += 1; // Each device is 1 unit

      // Group by frequency
      const frequency = device.FrequencyRegion || "868 MHz";
      if (!group.frequencies.has(frequency)) {
        group.frequencies.set(frequency, 0);
      }

      group.frequencies.set(frequency, group.frequencies.get(frequency) + 1);
    });

    // Convert to array format
    return Array.from(deviceGroups.values()).map((group) => ({
      sensorName: group.sensorName,
      totalQuantity: group.totalQuantity,
      frequencies: Array.from(group.frequencies.entries()).map((entry) => {
        const [frequency, quantity] = entry as [string, number];
        return {
          frequency,
          quantity,
        };
      }),
    }));
  } catch (error) {
    console.error("Error fetching detailed sensor inventory:", error);
    throw new Error("Failed to fetch detailed sensor inventory");
  }
}

/**
 * Get detailed component inventory for email reports
 */
export async function getDetailedComponentInventory() {
  try {
    const components = await prisma.componentStock.findMany({
      include: {
        component: {
          select: { id: true, name: true },
        },
      },
    });

    // Group by component type
    const componentGroups = new Map();

    components.forEach((stock) => {
      const componentKey = stock.component.name;

      if (!componentGroups.has(componentKey)) {
        componentGroups.set(componentKey, {
          name: stock.component.name,
          totalQuantity: 0,
          locations: new Map(),
        });
      }

      const group = componentGroups.get(componentKey);
      group.totalQuantity += stock.quantity;

      // Group by location
      const location = stock.location || "Unknown";
      if (!group.locations.has(location)) {
        group.locations.set(location, 0);
      }

      group.locations.set(
        location,
        group.locations.get(location) + stock.quantity,
      );
    });

    // Convert to array format
    return Array.from(componentGroups.values()).map((group) => ({
      name: group.name,
      totalQuantity: group.totalQuantity,
      locations: Array.from(group.locations.entries()).map((entry) => {
        const [location, quantity] = entry as [string, number];
        return {
          location,
          quantity,
        };
      }),
    }));
  } catch (error) {
    console.error("Error fetching detailed component inventory:", error);
    throw new Error("Failed to fetch detailed component inventory");
  }
}

export async function getSensorsSortedByFrequency() {
  try {
    // Aggregate sensors by DeviceType and FrequencyRegion, counting how many of each
    const sensors = await prisma.productionList.groupBy({
      by: ["DeviceType", "FrequencyRegion", "Batch"],
      where: {
        orderId: null, // Only devices in inventory
        DevEUI: { not: null },
      },
      _count: {
        id: true,
      },
      orderBy: {
        DeviceType: "asc",
      },
    });

    return sensors.map((sensor) => ({
      deviceType: sensor.DeviceType || "Unknown",
      frequency: sensor.FrequencyRegion || "unknown",
      count: sensor._count.id,
      BatchNumber: sensor.Batch || "N/A",
    }));
  } catch (error) {
    console.error("Error fetching sensors sorted by frequency:", error);
    throw new Error("Failed to fetch sensors sorted by frequency");
  }
}

/**
 * Get download URL for invoice file from B2 storage
 */
export async function getInvoiceFileDownloadUrl(invoiceNumber: string) {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { invoiceNumber },
      select: {
        filename: true,
        uploadDate: true,
      },
    });

    if (!invoice?.filename) {
      throw new Error("Invoice file not found");
    }

    // For B2 integration, you would generate a presigned URL here
    // This is a placeholder - you'd need to implement B2 presigned URL generation
    return {
      downloadUrl: `${process.env.NEK_URL}/${process.env.AWS_BUCKET_NAME}/${invoice.filename}`,
      filename: invoice.filename,
      uploadDate: invoice.uploadDate,
    };
  } catch (error) {
    console.error("Error getting invoice file download URL:", error);
    throw new Error("Failed to get invoice file download URL");
  }
}

/**
 * Get all invoice files for a component
 */
// export async function getComponentInvoiceFiles(componentId: number) {
//   try {
//     const componentStocks = await prisma.componentStock.findMany({
//       where: { componentId },
//       include: {
//         invoice: {
//           select: {
//             invoiceNumber: true,
//             filename: true,
//             uploadDate: true,
//             amount: true,
//           },
//         },
//         logs: {
//           where: {
//             invoice: { isNot: null },
//           },
//           include: {
//             invoice: {
//               select: {
//                 invoiceNumber: true,
//                 filename: true,
//                 uploadDate: true,
//                 amount: true,
//               },
//             },
//           },
//           orderBy: { timestamp: "desc" },
//         },
//       },
//     });

//     const allInvoices = new Map();

//     // Collect all unique invoices
//     componentStocks.forEach((stock) => {
//       if (stock.invoice) {
//         allInvoices.set(stock.invoice.invoiceNumber, stock.invoice);
//       }
//       stock.logs.forEach((log) => {
//         if (log.invoice) {
//           allInvoices.set(log.invoice.invoiceNumber, log.invoice);
//         }
//       });
//     });

//     return Array.from(allInvoices.values()).map((invoice) => ({
//       invoiceNumber: invoice.invoiceNumber,
//       filename: invoice.filename,
//       uploadDate: invoice.uploadDate,
//       amount: invoice.amount,
//       downloadUrl: invoice.filename
//         ? `${process.env.B2_PUBLIC_URL}/${invoice.filename}`
//         : null,
//     }));
//   } catch (error) {
//     console.error("Error fetching component invoice files:", error);
//     throw new Error("Failed to fetch component invoice files");
//   }
// }

export async function getLowComponents() {
  try {
    // Get all components with thresholds set and their stock information
    const componentsWithStock = await prisma.component.findMany({
      where: {
        treshold: { not: null },
      },
      select: {
        id: true,
        name: true,
        treshold: true,
        stockItems: {
          select: {
            quantity: true,
          },
        },
      },
    });

    const lowComponents: Array<{
      componentId: number;
      componentName: string;
      availableQuantity: number;
    }> = [];

    for (const comp of componentsWithStock) {
      // Since componentId is unique in ComponentStock, there should be only one stock item
      const stockItem = comp.stockItems[0];
      const availableQuantity = stockItem?.quantity ?? 0;

      if (availableQuantity <= (comp.treshold ?? 0)) {
        lowComponents.push({
          componentId: comp.id,
          componentName: comp.name,
          availableQuantity,
        });
      }
    }

    return lowComponents;
  } catch (error) {
    console.error("Error fetching low components:", error);
    throw new Error("Failed to fetch low components");
  }
}

/**
 * Get all orders
 */
export async function getAllOrders() {
  try {
    const orders = await prisma.order.findMany({
      orderBy: { orderDate: "desc" },
      include: {
        senzor: {
          select: { sensorName: true },
        },
        productionLists: {
          select: {
            id: true,
            DevEUI: true,
            DeviceType: true,
          },
        },
      },
    });

    return orders.map((order) => ({
      id: order.id,
      customerName: order.customerName,
      assemblerName: order.assemblerName,
      senzorId: order.senzorId,
      sensorName: order.senzor.sensorName,
      quantity: order.quantity,
      frequency: order.frequency,
      orderDate: order.orderDate,
      otherParameters: order.otherParameters,
      assignedDevices: order.productionLists.length,
      remainingToAssign: Math.max(
        0,
        order.quantity - order.productionLists.length,
      ),
    }));
  } catch (error) {
    console.error("Error fetching orders:", error);
    throw new Error("Failed to fetch orders");
  }
}
