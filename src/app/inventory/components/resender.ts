interface SensorInventoryItem {
  sensorName: string;
  totalQuantity: number;
  frequencies: Array<{
    frequency: string;
    quantity: number;
  }>;
}

interface InventoryEmailTemplateProps {
  recipientName: string;
  reportDate: string;
  sensorInventory: SensorInventoryItem[];
  lowStockItems: Array<{
    componentId: number;
    componentName: string;
    availableQuantity: number;
  }>;
  reportUrl?: string;
}

// Pretvorjeno iz React komponente v NAVADNO funkcijo, ki vrne HTML string -
// Next.js App Router PREPOVE uvoz react-dom/server znotraj app/ direktorija
// (tudi v Route Handler-jih), zato React sploh ni potreben za email HTML.
// Template literal deluje enako dobro za email HTML, brez te omejitve.
export function InventoryEmailTemplate({
  recipientName,
  reportDate,
  sensorInventory,
  lowStockItems,
  reportUrl = `${process.env.URL}/inventory`,
}: InventoryEmailTemplateProps): string {
  const sensorRows = sensorInventory
    .map(
      (sensor, index) => `
        <div style="padding: 15px 20px; border-bottom: ${
          index < sensorInventory.length - 1 ? "1px solid #E5E7EB" : "none"
        }; display: flex; justify-content: space-between; align-items: center;">
          <div style="flex: 1;">
            <h4 style="margin: 0 0 5px 0; color: #1F2937; font-size: 16px;">
              ${sensor.sensorName}
            </h4>
            <div style="font-size: 12px; color: #6B7280;">
              ${sensor.frequencies
                .map(
                  (freq) =>
                    `<span style="margin-right: 15px;">${freq.frequency}: ${freq.quantity} units</span>`,
                )
                .join("")}
            </div>
          </div>
          <div style="background-color: #EBF8FF; color: #2563EB; padding: 8px 15px; border-radius: 20px; font-size: 14px; font-weight: 600;">
            ${sensor.totalQuantity} total
          </div>
        </div>
      `,
    )
    .join("");

  const lowStockAlert =
    lowStockItems.length > 0
      ? `
        <div style="background-color: #FEF2F2; border: 1px solid #FECACA; border-radius: 8px; padding: 15px; margin: 20px 0;">
          <h3 style="color: #DC2626; margin: 0 0 10px 0; font-size: 16px;">
            ⚠️ Low Stock Alert
          </h3>
          <p style="color: #B91C1C; margin: 0; font-size: 14px;">
            ${lowStockItems.length} items are running low on stock. Please
            review the detailed report and consider restocking.
          </p>
        </div>
      `
      : "";

  const reportUrlLink = reportUrl
    ? `
        <a
          href="https://${reportUrl.replace(/^https?:\/\//, "")}"
          target="_blank"
          rel="noopener noreferrer"
          style="display: inline-block; background-color: #2563EB; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 500;"
        >
          View Full Report
        </a>
      `
    : "";

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px;">
      <div style="background-color: #1F2937; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 24px;">Senzemo Inventory Report</h1>
        <p style="margin: 10px 0 0 0; opacity: 0.9;">Monthly Inventory Summary</p>
      </div>

      <div style="background-color: #F9FAFB; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #E5E7EB;">
        <p style="font-size: 16px; line-height: 1.6; color: #374151;">
          Dear ${recipientName},
        </p>

        <p style="font-size: 16px; line-height: 1.6; color: #374151;">
          Here is your monthly inventory report for <strong>${reportDate}</strong>.
        </p>

        <div style="margin: 30px 0;">
          <h2 style="color: #1F2937; font-size: 18px; margin-bottom: 20px;">
            Sensor Inventory
          </h2>

          <div style="background-color: #ffffff; border-radius: 8px; border: 1px solid #E5E7EB; margin-bottom: 30px;">
            ${sensorRows}
          </div>

          ${lowStockAlert}
        </div>

        <div style="margin: 30px 0;">
          <h3 style="color: #1F2937; font-size: 16px; margin-bottom: 15px;">
            📊 Detailed Report
          </h3>
          <p style="font-size: 14px; line-height: 1.6; color: #6B7280; margin-bottom: 15px;">
            For a complete breakdown including frequency analysis, location
            distribution, and detailed inventory tables, please access your
            dashboard.
          </p>
          ${reportUrlLink}
        </div>

        <div style="border-top: 1px solid #E5E7EB; padding-top: 20px; margin-top: 30px;">
          <p style="font-size: 14px; color: #6B7280; line-height: 1.6;">
            This report was automatically generated on ${new Date().toLocaleDateString()}.
            If you have any questions about this inventory report, please
            contact your administrator.
          </p>

          <p style="font-size: 12px; color: #9CA3AF; margin-top: 15px;">
            © ${new Date().getFullYear()} Senzemo Inventory Management System.
            All rights reserved.
          </p>
        </div>
      </div>
    </div>
  `;
}
