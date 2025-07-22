import * as React from "react";
import { get } from "request";
import { getLowComponents } from "./backent";

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

export function InventoryEmailTemplate({
  recipientName,
  reportDate,
  sensorInventory,
  lowStockItems,
  reportUrl = "localhost:3000/inventory", // Default URL if not provided
}: InventoryEmailTemplateProps) {




  return (
    <div
      style={{
        fontFamily: "Arial, sans-serif",
        maxWidth: "600px",
        margin: "0 auto",
        backgroundColor: "#ffffff",
        padding: "20px",
      }}
    >
      {/* Header */}
      <div
        style={{
          backgroundColor: "#1F2937",
          color: "white",
          padding: "20px",
          textAlign: "center",
          borderRadius: "8px 8px 0 0",
        }}
      >
        <h1 style={{ margin: "0", fontSize: "24px" }}>
          Senzemo Inventory Report
        </h1>
        <p style={{ margin: "10px 0 0 0", opacity: "0.9" }}>
          Monthly Inventory Summary
        </p>
      </div>

      {/* Content */}
      <div
        style={{
          backgroundColor: "#F9FAFB",
          padding: "30px",
          borderRadius: "0 0 8px 8px",
          border: "1px solid #E5E7EB",
        }}
      >
        <p style={{ fontSize: "16px", lineHeight: "1.6", color: "#374151" }}>
          Dear {recipientName},
        </p>

        <p style={{ fontSize: "16px", lineHeight: "1.6", color: "#374151" }}>
          Here is your monthly inventory report for{" "}
          <strong>{reportDate}</strong>.
        </p>

        {/* Detailed Inventory */}
        <div style={{ margin: "30px 0" }}>
          <h2
            style={{ color: "#1F2937", fontSize: "18px", marginBottom: "20px" }}
          >
            Sensor Inventory
          </h2>

          {/* Sensor Inventory Table */}
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "8px",
              border: "1px solid #E5E7EB",
              marginBottom: "30px",
            }}
          >
            {sensorInventory.map((sensor, index) => (
              <div
                key={index}
                style={{
                  padding: "15px 20px",
                  borderBottom:
                    index < sensorInventory.length - 1
                      ? "1px solid #E5E7EB"
                      : "none",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div style={{ flex: "1" }}>
                  <h4
                    style={{
                      margin: "0 0 5px 0",
                      color: "#1F2937",
                      fontSize: "16px",
                    }}
                  >
                    {sensor.sensorName}
                  </h4>
                  <div style={{ fontSize: "12px", color: "#6B7280" }}>
                    {sensor.frequencies.map((freq, freqIndex) => (
                      <span key={freqIndex} style={{ marginRight: "15px" }}>
                        {freq.frequency}: {freq.quantity} units
                      </span>
                    ))}
                  </div>
                </div>
                <div
                  style={{
                    backgroundColor: "#EBF8FF",
                    color: "#2563EB",
                    padding: "8px 15px",
                    borderRadius: "20px",
                    fontSize: "14px",
                    fontWeight: "600",
                  }}
                >
                  {sensor.totalQuantity} total
                </div>
              </div>
            ))}
          </div>

          {/* Low Stock Alert */}
          {lowStockItems.length > 0 && (
            <div
              style={{
                backgroundColor: "#FEF2F2",
                border: "1px solid #FECACA",
                borderRadius: "8px",
                padding: "15px",
                margin: "20px 0",
              }}
            >
              <h3
                style={{
                  color: "#DC2626",
                  margin: "0 0 10px 0",
                  fontSize: "16px",
                }}
              >
                ⚠️ Low Stock Alert
              </h3>
              <p style={{ color: "#B91C1C", margin: "0", fontSize: "14px" }}>
                {lowStockItems.length} items are running low on stock. Please review
                the detailed report and consider restocking.
              </p>
            </div>
          )}
        </div>

        {/* Report Access */}
        <div style={{ margin: "30px 0" }}>
          <h3
            style={{ color: "#1F2937", fontSize: "16px", marginBottom: "15px" }}
          >
            📊 Detailed Report
          </h3>
          <p
            style={{
              fontSize: "14px",
              lineHeight: "1.6",
              color: "#6B7280",
              marginBottom: "15px",
            }}
          >
            For a complete breakdown including frequency analysis, location
            distribution, and detailed inventory tables, please access your
            dashboard.
          </p>

          {reportUrl && (
            <a
              href={`https://${reportUrl.replace(/^https?:\/\//, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-block",
                backgroundColor: "#2563EB",
                color: "white",
                padding: "12px 24px",
                textDecoration: "none",
                borderRadius: "6px",
                fontSize: "14px",
                fontWeight: "500",
              }}
            >
              View Full Report
            </a>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            borderTop: "1px solid #E5E7EB",
            paddingTop: "20px",
            marginTop: "30px",
          }}
        >
          <p style={{ fontSize: "14px", color: "#6B7280", lineHeight: "1.6" }}>
            This report was automatically generated on{" "}
            {new Date().toLocaleDateString()}. If you have any questions about
            this inventory report, please contact your administrator.
          </p>

          <p style={{ fontSize: "12px", color: "#9CA3AF", marginTop: "15px" }}>
            © {new Date().getFullYear()} Senzemo Inventory Management System.
            All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
