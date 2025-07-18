import { InventoryEmailTemplate } from "src/app/inventory/components/resender";
import { Resend } from "resend";
import { NextRequest } from "next/server";
import { generateInventoryReportBuffer } from "src/app/inventory/components/report_generator";
import { getDetailedSensorInventory } from "src/app/inventory/components/backent";

const resend = new Resend(process.env.RESEND_API_KEY);

interface InventoryReportData {
  recipientEmails: string[];
  recipientName: string;
  reportDate: string;
  lowStockItems: number;
  reportUrl?: string;
  subject?: string;
  includePdfAttachment?: boolean;
  lowStockThreshold?: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: InventoryReportData = await request.json();

    const {
      recipientEmails,
      recipientName,
      reportDate,
      lowStockItems,
      reportUrl,
      subject = `Senzemo Inventory Report - ${reportDate}`,
      includePdfAttachment = true,
      lowStockThreshold = 5,
    } = body;

    // Validate required fields
    if (!recipientEmails || recipientEmails.length === 0) {
      return Response.json(
        { error: "Recipient emails are required" },
        { status: 400 },
      );
    }

    if (!recipientName || !reportDate) {
      return Response.json(
        { error: "Recipient name and report date are required" },
        { status: 400 },
      );
    }

    // Get detailed inventory data for email
    const rawSensorInventory = await getDetailedSensorInventory();

    // Ensure proper typing for email template
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

    // Generate PDF attachment if requested
    let attachments = undefined;
    if (includePdfAttachment) {
      try {
        console.log("Generating PDF report buffer for email attachment...");
        const reportBuffer =
          await generateInventoryReportBuffer(lowStockThreshold);
        const filename = `inventory-report-${reportDate}.pdf`;

        attachments = [
          {
            filename,
            content: reportBuffer,
          },
        ];
      } catch (pdfError) {
        console.error("Error generating PDF attachment:", pdfError);
        // Continue without attachment rather than failing the email
      }
    }

    // Send email using Resend
    const { data, error } = await resend.emails.send({
      from: "anze.repse@sensedge.co", // Use Resend's test domain
      to: recipientEmails,
      subject,
      react: InventoryEmailTemplate({
        recipientName,
        reportDate,
        sensorInventory: detailedSensorInventory,
        lowStockItems: lowStockItems || 0,
        reportUrl,
      }),
      attachments,
    });

    if (error) {
      console.error("Resend API error:", error);
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({
      success: true,
      data,
      message: `Inventory report sent to ${recipientEmails.length} recipient(s)`,
    });
  } catch (error) {
    console.error("Error sending inventory report:", error);
    return Response.json(
      { error: "Failed to send inventory report" },
      { status: 500 },
    );
  }
}

// Health check endpoint
export async function GET() {
  return Response.json({
    status: "ok",
    service: "inventory-report-sender",
    timestamp: new Date().toISOString(),
  });
}
