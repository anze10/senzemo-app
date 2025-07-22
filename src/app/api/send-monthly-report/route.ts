import { NextRequest } from "next/server";
import { InventoryEmailTemplate } from "src/app/inventory/components/resender";
import { Resend } from "resend";
import {
  getDetailedComponentInventory,
  getDetailedSensorInventory,
  getLowComponents,
  getProductionHierarchy,
  showAllComponents,
} from "src/app/inventory/components/backent";
import { generateInventoryReportBuffer } from "src/app/inventory/components/report_generator";
import { prisma } from "~/server/DATABASE_ACTION/prisma";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const today = new Date();
    const dayOfTheMonth = today.getDate();

    const mailingList = await prisma.mailing.findMany({
      where: {
        Date_of_monthly_report: dayOfTheMonth,
      },
      include: {
        user: true,
      },
    });
    // Fetch real inventory data
    const [
      sensorData,
      componentData,
      rawSensorInventory,
      componentDataDetailed,
      lowStockComponents,
    ] = await Promise.all([
      getProductionHierarchy(),
      showAllComponents(),
      getDetailedSensorInventory(),
      getDetailedComponentInventory(),
      getLowComponents(),
    ]);

    // Ensure proper typing for email template
    // interface RawSensor {
    //   sensorName: string;
    //   totalQuantity: number;
    //   frequencies: Array<{ frequency: string; quantity: number }>;
    // }

    const detailedSensorInventory = rawSensorInventory.map(
      (sensor: {
        sensorName: string;
        totalQuantity: number;
        frequencies: Array<{ frequency: string; quantity: number }>;
      }) => ({
        sensorName: String(sensor.sensorName),
        totalQuantity: Number(sensor.totalQuantity),
        frequencies: sensor.frequencies.map(
          (freq: { frequency: string; quantity: number }) => ({
            frequency: String(freq.frequency),
            quantity: Number(freq.quantity),
          }),
        ),
      }),
    );

    // Calculate statistics
    const uniqueSensorTypes = sensorData.length;
    const uniqueComponentTypes = componentData.length;

    // Generate PDF report buffer for attachment
    console.log("Generating PDF report buffer for email attachment...");
    const reportBuffer = await generateInventoryReportBuffer();
    const reportDate = new Date().toISOString().split("T")[0];
    const filename = `inventory-report-${reportDate}.pdf`;

    // Send email to all recipients
    mailingList.map((mail) =>
      resend.emails.send({
        from: "anze.repse@sensedge.co", // Use Resend's test domain
        to: [mail.user.email],
        subject: `Monthly Inventory Report - ${today.toDateString()}`,
        react: InventoryEmailTemplate({
          recipientName: mail.user.name || "Senzemo User",
          reportDate: today.toDateString(),
          sensorInventory: detailedSensorInventory,
          lowStockItems: lowStockComponents,
        }),
        attachments: [
          {
            filename,
            content: reportBuffer,
          },
        ],
      }),
    );
  } catch (error) {
    console.error("Error sending monthly report:", error);
    return Response.json(
      { error: "Failed to send monthly report" },
      { status: 500 },
    );
  }
}
