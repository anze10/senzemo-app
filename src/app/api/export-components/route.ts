// src/app/api/export-components/route.ts
import ExcelJS from "exceljs";
import { prisma } from "~/server/DATABASE_ACTION/prisma";

export async function GET() {
  const componentStocks = await prisma.componentStock.findMany({
    include: {
      component: { select: { name: true, Component_price: true } }, // popravljeno ime
    },
    orderBy: { component: { name: "asc" } },
  });

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Zaloga komponent");

  sheet.columns = [
    { header: "Komponenta", key: "name", width: 30 },
    { header: "Količina", key: "quantity", width: 12 },
    // { header: "Lokacija", key: "location", width: 20 },
    { header: "Dobavitelj", key: "supplier", width: 20 },
    { header: "Cena (€)", key: "price", width: 12 },
    { header: "Skupna vrednost (€)", key: "totalValue", width: 18 },
    { header: "Nazadnje posodobljeno", key: "lastUpdated", width: 22 },
  ];

  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE5E5E5" },
  };

  componentStocks.forEach((stock, index) => {
    const rowNumber = index + 2;

    sheet.addRow({
      name: stock.component.name,
      quantity: stock.quantity,
      // location: stock.location ?? "",
      supplier: stock.supplier ?? "",
      price: stock.component.Component_price ?? 0, // popravljeno ime
      totalValue: { formula: `B${rowNumber}*E${rowNumber}` },
      lastUpdated: stock.lastUpdated.toLocaleDateString("sl-SI"),
    });
  });

  sheet.getColumn("price").numFmt = '#,##0.00 "€"';
  sheet.getColumn("totalValue").numFmt = '#,##0.00 "€"';

  const buffer = await workbook.xlsx.writeBuffer();
  const filename = `zaloga-komponent-${new Date().toISOString().split("T")[0]}.xlsx`;

  return new Response(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
