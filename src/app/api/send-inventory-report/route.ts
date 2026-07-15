import { InventoryEmailTemplate } from "src/app/inventory/components/resender";
import { Resend } from "resend";
import { generateInventoryReportBuffer } from "src/app/inventory/components/report_generator";
import {
  getDetailedSensorInventory,
  getLowComponents,
} from "src/app/inventory/components/backent";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST() {
  const today = new Date();

  // Test email configuration - only send to one test email
  const testEmail = "anze.repse@gmail.com"; // Replace with your test email
  const testUserName = "Test User";

  const componentLowComponents = await getLowComponents();

  // Get detailed inventory data for email
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

  // Generate PDF attachment if requested
  let attachments = undefined;
  try {
    console.log("Generating PDF report buffer for email attachment...");
    // TODO: refactor to use componentLowComponents instead of the user variable lowStockThreshold
    const reportBuffer = await generateInventoryReportBuffer();
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

  // Send test email to single recipient
  const fields = {
    from: "delivered@resend.dev", // Use Resend's test domain
    to: testEmail,
    subject: `Senzemo Inventory Report (TEST) - ${today.toDateString()}`,
    react: InventoryEmailTemplate({
      recipientName: testUserName,
      reportDate: today.toDateString(),
      sensorInventory: detailedSensorInventory,
      lowStockItems: componentLowComponents,
      // reportUrl,
    }),
    attachments,
  };

  // Send email using Resend
  try {
    const { data, error } = await resend.emails.send(fields);

    if (error) {
      console.error("Error sending test email:", error);
      return Response.json(
        { error: "Failed to send test email", details: error },
        { status: 500 },
      );
    }

    console.log("Test email sent successfully:", data);
    return Response.json({
      success: true,
      message: "Test inventory email sent successfully",
      emailId: data?.id,
      sentTo: testEmail,
    });
  } catch (emailError) {
    console.error("Error sending test email:", emailError);
    return Response.json(
      { error: "Failed to send test email", details: emailError },
      { status: 500 },
    );
  }
}
