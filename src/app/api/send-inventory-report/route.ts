import { InventoryEmailTemplate } from "src/app/inventory/components/resender";
import { Resend } from "resend";
import { generateInventoryReportBuffer } from "src/app/inventory/components/report_generator";
import {
  getDetailedSensorInventory,
  getLowComponents,
} from "src/app/inventory/components/backent";
import { prisma } from "~/server/DATABASE_ACTION/prisma";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST() {
  const today = new Date();
  const currentDay = today.getDate();

  // Najdi VSE naročnine, ki so aktivne IN naj se pošljejo DANES
  const dueSubscriptions = await prisma.mailing.findMany({
    where: {
      isSubscribed: true,
      dayOfMonth: currentDay,
    },
    include: {
      user: {
        select: { email: true, name: true },
      },
    },
  });

  if (dueSubscriptions.length === 0) {
    return Response.json({ message: "Ni naročnin za poslati danes." });
  }

  const componentLowComponents = await getLowComponents();
  const rawSensorInventory = await getDetailedSensorInventory();

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

  let attachments = undefined;
  try {
    console.log("Generating PDF report buffer for email attachment...");
    const reportBuffer = await generateInventoryReportBuffer();
    const filename = `inventory-report-${today.toDateString()}.pdf`;
    attachments = [{ filename, content: reportBuffer }];
  } catch (pdfError) {
    console.error("Error generating PDF attachment:", pdfError);
  }

  const results: {
    email: string;
    success: boolean;
    emailId?: string;
    error?: unknown;
  }[] = [];

  for (const subscription of dueSubscriptions) {
    const recipientEmail = subscription.user.email;
    const recipientName = subscription.user.name ?? "Uporabnik";

    // Zgradi subject iz shrambe naročnine, zamenjaj {date} placeholder
    const subjectTemplate =
      subscription.subject ?? "Monthly Inventory Report - {date}";
    const subject = subjectTemplate.replace("{date}", today.toDateString());

    try {
      const { data, error } = await resend.emails.send({
        from: "anze@repse.si",
        to: recipientEmail,
        subject,
        react: InventoryEmailTemplate({
          recipientName,
          reportDate: today.toDateString(),
          sensorInventory: detailedSensorInventory,
          lowStockItems: componentLowComponents,
        }),
        attachments,
      });

      if (error) {
        console.error(`Error sending to ${recipientEmail}:`, error);
        results.push({ email: recipientEmail, success: false, error });
        continue;
      }

      // Posodobi lastSentAt in Date_of_monthly_report SAMO ob uspehu
      await prisma.mailing.update({
        where: { id: subscription.id },
        data: {
          lastSentAt: new Date(),
          Date_of_monthly_report: currentDay,
        },
      });

      results.push({ email: recipientEmail, success: true, emailId: data?.id });
    } catch (err) {
      console.error(`Error sending to ${recipientEmail}:`, err);
      results.push({ email: recipientEmail, success: false, error: err });
    }
  }

  return Response.json({
    success: true,
    message: `Poslano ${results.filter((r) => r.success).length}/${results.length} email-ov.`,
    results,
  });
}
