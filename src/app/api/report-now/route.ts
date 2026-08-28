export const runtime = "nodejs";
import { InventoryEmailTemplate } from "src/app/inventory/components/resender";
import { Resend } from "resend";
import { generateInventoryReportBuffer } from "src/app/inventory/components/report_generator";
import {
  getDetailedSensorInventory,
  getLowComponents,
} from "src/app/inventory/components/backent";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    console.log("1. send-now started");

    const body = await request.json();
    console.log("2. body:", body);

    const { recipientEmails, recipientName, reportDate, subject } = body;

    if (!recipientEmails?.length) {
      return Response.json(
        { error: "recipientEmails manjka" },
        { status: 400 },
      );
    }

    console.log("3. recipient:", recipientEmails);

    console.log("4. getting low components");
    const componentLowComponents = await getLowComponents();
    console.log("5. low components ok");

    console.log("6. getting sensor inventory");
    const rawSensorInventory = await getDetailedSensorInventory();
    console.log("7. sensor inventory ok");

    const detailedSensorInventory = rawSensorInventory.map((sensor) => ({
      sensorName: String(sensor.sensorName),
      totalQuantity: Number(sensor.totalQuantity),
      frequencies: sensor.frequencies.map((freq) => ({
        frequency: String(freq.frequency),
        quantity: Number(freq.quantity),
      })),
    }));

    console.log("8. generating pdf");
    const reportBuffer = await generateInventoryReportBuffer();
    console.log("9. pdf generated");

    const attachments = [
      {
        filename: `inventory-report-${new Date().toDateString()}.pdf`,
        content: reportBuffer,
      },
    ];

    console.log("10. sending email");

    const results = [];

    for (const recipientEmail of recipientEmails) {
      console.log("11. sending to:", recipientEmail);

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

      console.log("12. resend response:", { data, error });

      if (error) {
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
    console.error("SEND-NOW FATAL ERROR:", error);

    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
