import { InventoryEmailTemplate } from "src/app/inventory/components/resender";
import { Resend } from "resend";
import { generateInventoryReportBuffer } from "src/app/inventory/components/report_generator";
import {
  getDetailedSensorInventory,
  getLowComponents,
} from "src/app/inventory/components/backent";
import { prisma } from "~/server/DATABASE_ACTION/prisma";

const resend = new Resend(process.env.RESEND_API_KEY);

/* interface InventoryReportData {
  recipientEmails: string[];
  recipientName: string;
  reportDate: string;
  lowStockItems: number;
  reportUrl?: string;
  subject?: string;
  includePdfAttachment?: boolean;
  lowStockThreshold?: number;
} */

export async function GET() {
  // const body: InventoryReportData = await request.json();

  /* const {
      recipientEmails,
      recipientName,
      reportDate,
      lowStockItems,
      reportUrl,
      subject = `Senzemo Inventory Report - ${reportDate}`,
      includePdfAttachment = true,
      lowStockThreshold = 5,
    } = body; */

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

  const componentLowComponents = await getLowComponents();

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
  try {
    console.log("Generating PDF report buffer for email attachment...");
    // TODO: refactor to use componentLowComponents instead of the user variable lowStockThreshold
    const reportBuffer = await generateInventoryReportBuffer(5);
    const filename = `inventory-report-${today.toDateString()}.pdf`;

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

  for (const mail of mailingList) {
    const fields = {
      from: "anze.repse@sensedge.co", // Use Resend's test domain
      to: mail.user.email,
      subject: `Senzemo Inventory Report - ${today.toDateString()}`,
      react: InventoryEmailTemplate({
        recipientName: mail.user.name || "Senzemo User",
        reportDate: today.toDateString(),
        sensorInventory: detailedSensorInventory,
        lowStockItems: componentLowComponents.length,
        // reportUrl,
      }),
      attachments,
    };

    // Send email using Resend
    const { error } = await resend.emails.send(fields);

    if (error) {
      console.error("Error sending email:", error);
    }
  }
}
