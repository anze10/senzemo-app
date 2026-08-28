import { InventoryEmailTemplate } from "src/app/inventory/components/resender";
import { Resend } from "resend";
import { generateInventoryReportBuffer } from "src/app/inventory/components/report_generator";
import {
  getDetailedSensorInventory,
  getLowComponents,
} from "src/app/inventory/components/backent";
//import { prisma } from "~/server/DATABASE_ACTION/prisma";
const resend = new Resend(process.env.RESEND_API_KEY);
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { recipientEmails, recipientName, reportDate, subject } = body;

    if (!recipientEmails?.length) {
      return Response.json(
        { error: "recipientEmails manjka" },
        { status: 400 },
      );
    }

    const componentLowComponents = await getLowComponents();
    const rawSensorInventory = await getDetailedSensorInventory();

    const detailedSensorInventory = rawSensorInventory.map((sensor) => ({
      sensorName: String(sensor.sensorName),
      totalQuantity: Number(sensor.totalQuantity),
      frequencies: sensor.frequencies.map((freq) => ({
        frequency: String(freq.frequency),
        quantity: Number(freq.quantity),
      })),
    }));

    const reportBuffer = await generateInventoryReportBuffer();

    const attachments = [
      {
        filename: `inventory-report-${new Date().toDateString()}.pdf`,
        content: reportBuffer,
      },
    ];

    const results = [];

    for (const recipientEmail of recipientEmails) {
      const { data, error } = await resend.emails.send({
        from: "tool@sensedge.co",
        to: recipientEmail,
        subject,
        react: InventoryEmailTemplate({
          recipientName: recipientName || "Uporabnik",
          reportDate: reportDate || new Date().toDateString(),
          sensorInventory: detailedSensorInventory,
          lowStockItems: componentLowComponents,
        }),
        attachments,
      });

      if (error) {
        console.error("resend error:", error);

        results.push({
          email: recipientEmail,
          success: false,
          error,
        });
      } else {
        results.push({
          email: recipientEmail,
          success: true,
          emailId: data?.id,
        });
      }
    }

    const failed = results.filter((r) => !r.success);

    if (failed.length > 0) {
      return Response.json(
        {
          success: false,
          results,
        },
        { status: 500 },
      );
    }

    return Response.json({
      success: true,
      message: "testni email je bil poslan.",
      results,
    });
  } catch (error) {
    console.error("send inventory report error:", error);

    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "neznana napaka",
      },
      { status: 500 },
    );
  }
}
