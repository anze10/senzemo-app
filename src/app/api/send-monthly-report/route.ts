import { NextRequest } from "next/server";
import { InventoryEmailTemplate } from "src/app/inventory/components/resender";
import { Resend } from "resend";
import {
  getDetailedComponentInventory,
  getDetailedSensorInventory,
  getProductionHierarchy,
  showAllComponents,
} from "src/app/inventory/components/backent";
import { generateInventoryReportBuffer } from "src/app/inventory/components/report_generator";

// Define types for inventory items
// interface InventoryItem {
//   quantity: number;
//   [key: string]: unknown;
// }

const resend = new Resend(process.env.RESEND_API_KEY);

interface MonthlyReportSettings {
  recipients: string[];
  subject?: string;
  includeReportUrl?: boolean;
  lowStockThreshold?: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: MonthlyReportSettings = await request.json();

    const {
      recipients,
      subject = `Monthly Inventory Report - ${new Date().toLocaleDateString()}`,
      includeReportUrl = true,
      lowStockThreshold = 5,
    } = body;

    // Validate required fields
    if (!recipients || recipients.length === 0) {
      return Response.json(
        { error: "Recipients are required" },
        { status: 400 },
      );
    }

    // Fetch real inventory data
    const [sensorData, componentData, rawSensorInventory] = await Promise.all([
      getProductionHierarchy(),
      showAllComponents(),
      getDetailedSensorInventory(),
      getDetailedComponentInventory(),
    ]);

    // Ensure proper typing for email template
    interface RawSensor {
      sensorName: string;
      totalQuantity: number;
      frequencies: Array<{ frequency: string; quantity: number }>;
    }

    const detailedSensorInventory = rawSensorInventory.map(
      (sensor: RawSensor) => ({
        sensorName: String(sensor.sensorName),
        totalQuantity: Number(sensor.totalQuantity),
        frequencies: sensor.frequencies.map((freq) => ({
          frequency: String(freq.frequency),
          quantity: Number(freq.quantity),
        })),
      }),
    );

    // const detailedComponentInventory = rawComponentInventory.map(
    //   (component) => ({
    //     name: String(component.name),
    //     totalQuantity: Number(component.totalQuantity),
    //     locations: (
    //       component.locations as Array<{ location: string; quantity: number }>
    //     ).map((loc) => ({
    //       location: String(loc.location),
    //       quantity: Number(loc.quantity),
    //     })),
    //   }),
    // );

    // Calculate statistics
    const uniqueSensorTypes = sensorData.length;
    const uniqueComponentTypes = componentData.length;
    const lowStockItems = [
      ...sensorData.filter(
        (item: { deviceType: string; totalDevices: number }) =>
          item.totalDevices <= lowStockThreshold,
      ),
      ...componentData.filter(
        (item) =>
          typeof item.quantity === "number" &&
          item.quantity <= lowStockThreshold,
      ),
    ].length;

    // Generate PDF report buffer for attachment
    console.log("Generating PDF report buffer for email attachment...");
    const reportBuffer = await generateInventoryReportBuffer(lowStockThreshold);
    const reportDate = new Date().toISOString().split("T")[0];
    const filename = `inventory-report-${reportDate}.pdf`;

    // Send email to all recipients
    const emailPromises = recipients.map((email) =>
      resend.emails.send({
        from: "anze.repse@sensedge.co", // Use Resend's test domain
        to: [email],
        subject,
        react: InventoryEmailTemplate({
          recipientName: "Team Member",
          reportDate: new Date().toLocaleDateString(),
          sensorInventory: detailedSensorInventory,
          lowStockItems,
          reportUrl: includeReportUrl
            ? `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/inventory`
            : undefined,
        }),
        attachments: [
          {
            filename,
            content: reportBuffer,
          },
        ],
      }),
    );

    const results = await Promise.allSettled(emailPromises);

    const successful = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    if (failed > 0) {
      const errors = results
        .filter((r) => r.status === "rejected")
        .map((r) => (r.status === "rejected" ? r.reason : null));

      console.error("Some emails failed to send:", errors);

      return Response.json(
        {
          success: false,
          message: `${successful} emails sent successfully, ${failed} failed`,
          data: { successful, failed, errors },
        },
        { status: 207 },
      ); // Multi-status
    }

    return Response.json({
      success: true,
      message: `Monthly report sent successfully to ${successful} recipient(s)`,
      data: {
        successful,
        failed: 0,
        reportStats: {
          uniqueSensorTypes,
          uniqueComponentTypes,
          lowStockItems,
        },
      },
    });
  } catch (error) {
    console.error("Error sending monthly report:", error);
    return Response.json(
      { error: "Failed to send monthly report" },
      { status: 500 },
    );
  }
}

// Manual trigger endpoint
export async function GET() {
  // This could be used for manual triggers or health checks
  return Response.json({
    status: "ok",
    service: "monthly-report-sender",
    timestamp: new Date().toISOString(),
    nextScheduled: getNextScheduledDate(),
  });
}

function getNextScheduledDate() {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return nextMonth.toISOString();
}
