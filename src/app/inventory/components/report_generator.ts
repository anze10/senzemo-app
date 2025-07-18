import { pdf } from "@react-pdf/renderer";
import React from "react";
import InventoryReport from "./prepere_report";
import { getSensorsSortedByFrequency, showAllComponents } from "./backent";
import type { DocumentProps } from "@react-pdf/renderer";

// Types for the report data
interface SensorStockData {
  id: number;
  sensorName: string;
  quantity: number;

  frequency?: string | null;
  productionBatch?: string | null;
}

interface ComponentStockData {
  id: number;
  name: string;
  quantity: number;
  location: string;
  supplier?: string;
  lastUpdated: Date;
}

// Function to fetch and format sensor data
const formatSensorData = async (): Promise<SensorStockData[]> => {
  try {
    const rawSensorData = await getSensorsSortedByFrequency();
    return rawSensorData.map((sensor, index) => ({
      id: index + 1, // Generate unique numeric ID based on array index
      sensorName: sensor.deviceType,
      quantity: sensor.count,
      frequency: sensor.frequency,
      productionBatch: sensor.BatchNumber,
    }));
  } catch (error) {
    console.error("Error fetching sensor data:", error);
    return [];
  }
};

// Function to fetch and format component data
const formatComponentData = async (): Promise<ComponentStockData[]> => {
  try {
    const rawComponentData = await showAllComponents();
    return rawComponentData.map((component) => ({
      id: component.id,
      name: component.name,
      quantity: component.quantity,
      location: component.location,
      supplier: component.contactDetails?.supplier || "",
      lastUpdated: new Date(component.lastUpdated),
    }));
  } catch (error) {
    console.error("Error fetching component data:", error);
    return [];
  }
};

// Main function to generate and download the inventory report
export const generateInventoryReport = async (
  lowStockThreshold: number = 5,
): Promise<void> => {
  try {
    // Show loading state
    console.log("Generating inventory report...");

    // Fetch data
    const [sensorData, componentData] = await Promise.all([
      formatSensorData(),
      formatComponentData(),
    ]);

    // Convert to the types expected by the report component
    const sensorStock = sensorData.map((sensor) => ({
      id: sensor.id,
      sensorName: sensor.sensorName,
      quantity: sensor.quantity,
      frequency: sensor.frequency || undefined,
      productionBatch: sensor.productionBatch || undefined,
    }));

    const componentStock = componentData.map((component) => ({
      id: component.id,
      name: component.name,
      quantity: component.quantity,
      location: component.location,
      supplier: component.supplier || undefined,
      lastUpdated: component.lastUpdated,
    }));

    // Generate the PDF
    const reportDate = new Date();

    // Convert to blob and download
    const reportElement = React.createElement(InventoryReport, {
      sensorStock,
      componentStock,
      reportDate,
      lowStockThreshold,
    });

    const blob = await pdf(
      reportElement as React.ReactElement<DocumentProps>,
    ).toBlob();

    // Create download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;

    // Generate filename with timestamp
    const timestamp = reportDate.toISOString().split("T")[0];
    link.download = `inventory-report-${timestamp}.pdf`;

    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up
    URL.revokeObjectURL(url);

    console.log("Inventory report generated successfully!");
  } catch (error) {
    console.error("Error generating inventory report:", error);
    throw new Error("Failed to generate inventory report");
  }
};

// Function to preview the report (opens in new tab)
export const previewInventoryReport = async (
  lowStockThreshold: number = 5,
): Promise<void> => {
  try {
    console.log("Generating inventory report preview...");

    // Fetch data
    const [sensorData, componentData] = await Promise.all([
      formatSensorData(),
      formatComponentData(),
    ]);

    // Convert to the types expected by the report component
    const sensorStock = sensorData.map((sensor) => ({
      id: sensor.id,
      sensorName: sensor.sensorName,
      quantity: sensor.quantity,

      frequency: sensor.frequency || undefined,
      productionBatch: sensor.productionBatch || undefined,
    }));

    const componentStock = componentData.map((component) => ({
      id: component.id,
      name: component.name,
      quantity: component.quantity,
      location: component.location,
      supplier: component.supplier || undefined,
      lastUpdated: component.lastUpdated,
    }));

    // Generate the PDF
    const reportDate = new Date();

    // Convert to blob and open in new tab
    const reportElement = React.createElement(InventoryReport, {
      sensorStock,
      componentStock,
      reportDate,
      lowStockThreshold,
    });

    const blob = await pdf(
      reportElement as React.ReactElement<DocumentProps>,
    ).toBlob();
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");

    console.log("Inventory report preview opened successfully!");
  } catch (error) {
    console.error("Error previewing inventory report:", error);
    throw new Error("Failed to preview inventory report");
  }
};

// Function to generate PDF buffer for email attachment
export const generateInventoryReportBuffer = async (
  lowStockThreshold: number = 5,
): Promise<Buffer> => {
  try {
    console.log("Generating inventory report buffer...");

    // Fetch data
    const [sensorData, componentData] = await Promise.all([
      formatSensorData(),
      formatComponentData(),
    ]);

    // Convert to the types expected by the report component
    const sensorStock = sensorData.map((sensor) => ({
      id: sensor.id,
      sensorName: sensor.sensorName,
      quantity: sensor.quantity,
      frequency: sensor.frequency || undefined,
      productionBatch: sensor.productionBatch || undefined,
    }));

    const componentStock = componentData.map((component) => ({
      id: component.id,
      name: component.name,
      quantity: component.quantity,
      location: component.location,
      supplier: component.supplier || undefined,
      lastUpdated: component.lastUpdated,
    }));

    // Generate the PDF
    const reportDate = new Date();

    const reportElement = React.createElement(InventoryReport, {
      sensorStock,
      componentStock,
      reportDate,
      lowStockThreshold,
    });

    // Generate PDF buffer
    const stream = await pdf(
      reportElement as React.ReactElement<DocumentProps>,
    ).toBuffer();

    // Convert ReadableStream to Buffer (Node.js only)
    const buffer = await new Promise<Buffer>((resolve, reject) => {
      const chunks: Uint8Array[] = [];
      stream.on("data", (chunk: Uint8Array) => chunks.push(chunk));
      stream.on("end", () => resolve(Buffer.concat(chunks)));
      stream.on("error", reject);
    });

    console.log("Inventory report buffer generated successfully!");
    return buffer;
  } catch (error) {
    console.error("Error generating inventory report buffer:", error);
    throw new Error("Failed to generate inventory report buffer");
  }
};

// Function to get report summary without generating PDF
export const getInventorySummary = async () => {
  try {
    const [sensorData, componentData] = await Promise.all([
      formatSensorData(),
      formatComponentData(),
    ]);

    const totalSensors = sensorData.reduce(
      (sum, item) => sum + item.quantity,
      0,
    );
    const totalComponents = componentData.reduce(
      (sum, item) => sum + item.quantity,
      0,
    );
    const uniqueSensorTypes = sensorData.length;
    const uniqueComponentTypes = componentData.length;

    const lowStockItems = [
      ...sensorData.filter((item) => item.quantity <= 5),
      ...componentData.filter((item) => item.quantity <= 5),
    ];

    return {
      totalSensors,
      totalComponents,
      uniqueSensorTypes,
      uniqueComponentTypes,
      lowStockCount: lowStockItems.length,
      totalValue: totalSensors + totalComponents,
    };
  } catch (error) {
    console.error("Error getting inventory summary:", error);
    throw new Error("Failed to get inventory summary");
  }
};
