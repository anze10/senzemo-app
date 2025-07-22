import React from "react";
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    flexDirection: "column",
    backgroundColor: "#FFFFFF",
    padding: 30,
    fontFamily: "Helvetica",
  },
  header: {
    marginBottom: 20,
    textAlign: "center",
    borderBottom: 2,
    borderBottomColor: "#374151",
    paddingBottom: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 10,
  },
  reportDate: {
    fontSize: 10,
    color: "#9CA3AF",
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#374151",
    marginBottom: 10,
    borderBottom: 1,
    borderBottomColor: "#E5E7EB",
    paddingBottom: 5,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    padding: 8,
    borderBottom: 1,
    borderBottomColor: "#D1D5DB",
    fontWeight: "bold",
    fontSize: 10,
  },
  tableRow: {
    flexDirection: "row",
    padding: 8,
    borderBottom: 1,
    borderBottomColor: "#E5E7EB",
    fontSize: 9,
  },
  tableRowAlt: {
    flexDirection: "row",
    padding: 8,
    borderBottom: 1,
    borderBottomColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    fontSize: 9,
  },
  tableCell: {
    flex: 1,
    textAlign: "left",
  },
  tableCellCenter: {
    flex: 1,
    textAlign: "center",
  },
  tableCellRight: {
    flex: 1,
    textAlign: "right",
  },
  summaryCard: {
    backgroundColor: "#F8FAFC",
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 5,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1E293B",
    marginBottom: 8,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 10,
    color: "#475569",
  },
  summaryValue: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#0F172A",
  },
  lowStockWarning: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
    borderWidth: 1,
    padding: 10,
    marginBottom: 15,
    borderRadius: 5,
  },
  warningTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#DC2626",
    marginBottom: 5,
  },
  warningText: {
    fontSize: 9,
    color: "#7F1D1D",
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: "center",
    fontSize: 8,
    color: "#9CA3AF",
    borderTop: 1,
    borderTopColor: "#E5E7EB",
    paddingTop: 10,
  },
  frequencySection: {
    marginTop: 15,
    padding: 10,
    backgroundColor: "#F0F9FF",
    borderWidth: 1,
    borderColor: "#BAE6FD",
  },
  frequencyTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#0C4A6E",
    marginBottom: 8,
  },
  frequencyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  frequencyLabel: {
    fontSize: 9,
    color: "#0F172A",
  },
  frequencyValue: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#1E40AF",
  },
});

// Interface definitions
interface SensorStock {
  id: number;
  sensorName: string;
  quantity: number;
  frequency?: string;
  productionBatch?: string;
}

interface ComponentStock {
  id: number;
  name: string;
  quantity: number;
  location: string;
  supplier?: string;
  lastUpdated: Date;
}

interface InventoryReportProps {
  sensorStock: SensorStock[];
  componentStock: ComponentStock[];
  reportDate: Date;
  lowStockItems: {
    componentId: number;
    componentName: string;
    availableQuantity: number;
  }[];
}

// Frequency analysis helper
const analyzeFrequencies = (sensorStock: SensorStock[]) => {
  const frequencyMap = new Map<string, number>();
  sensorStock.forEach((sensor) => {
    const freq = sensor.frequency || "Unknown";
    frequencyMap.set(freq, (frequencyMap.get(freq) || 0) + sensor.quantity);
  });
  return Array.from(frequencyMap.entries()).sort((a, b) => b[1] - a[1]);
};

// Location analysis helper

// Create Document Component
const InventoryReport: React.FC<InventoryReportProps> = ({
  sensorStock,
  componentStock,
  reportDate,
  lowStockItems,
}) => {
  // Calculate summary statistics
  const totalSensors = sensorStock.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );
  const totalComponents = componentStock.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );
  const uniqueSensorTypes = sensorStock.length;
  const uniqueComponentTypes = componentStock.length;

  // Analyze frequencies and locations
  const frequencyAnalysis = analyzeFrequencies(sensorStock);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          {/* <Image src="senzemoLogo.png" style={{ width: 100, height: 50 }} /> */}

          <Text style={styles.subtitle}>
            Component and Sensor Inventory Status
          </Text>
          <Text style={styles.reportDate}>
            Generated on: {reportDate.toLocaleDateString()} at{" "}
            {reportDate.toLocaleTimeString()}
          </Text>
        </View>

        {/* Summary Cards */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Inventory Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Sensors in Stock:</Text>
            <Text style={styles.summaryValue}>{totalSensors} units</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Unique Sensor Types:</Text>
            <Text style={styles.summaryValue}>{uniqueSensorTypes} types</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Components in Stock:</Text>
            <Text style={styles.summaryValue}>{totalComponents} units</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Unique Component Types:</Text>
            <Text style={styles.summaryValue}>
              {uniqueComponentTypes} types
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Inventory Value:</Text>
            <Text style={styles.summaryValue}>
              {totalSensors + totalComponents} units
            </Text>
          </View>
        </View>

        {/* Frequency Analysis */}
        {frequencyAnalysis.length > 0 && (
          <View style={styles.frequencySection}>
            <Text style={styles.frequencyTitle}> Frequency Distribution</Text>
            {frequencyAnalysis.map(([freq, count]) => (
              <View key={freq} style={styles.frequencyRow}>
                <Text style={styles.frequencyLabel}>{freq}:</Text>
                <Text style={styles.frequencyValue}>{count} units</Text>
              </View>
            ))}
          </View>
        )}

        {/* Low Stock Warning */}
        {lowStockItems.length > 0 && (
          <View style={styles.lowStockWarning}>
            <Text style={styles.warningTitle}> LOW STOCK ALERT</Text>
            <Text style={styles.warningText}>
              {lowStockItems.length} item(s) below threshold (
              {lowStockItems
                .map(
                  (item) => `${item.componentName} (${item.availableQuantity})`,
                )
                .join(", ")}
              )
            </Text>
          </View>
        )}

        {/* Sensor Stock Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}> SENSOR INVENTORY</Text>

          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCell, { flex: 2 }]}>Sensor Name</Text>
            <Text style={styles.tableCellCenter}>Qty</Text>
            <Text style={styles.tableCell}>Frequency</Text>
            <Text style={styles.tableCell}>Batch</Text>
          </View>

          {/* Table Rows */}
          {sensorStock.length > 0 ? (
            sensorStock.map((sensor, index) => (
              <View
                key={sensor.id}
                style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlt}
              >
                <Text style={[styles.tableCell, { flex: 2 }]}>
                  {sensor.sensorName}
                </Text>
                <Text style={styles.tableCellCenter}>{sensor.quantity}</Text>
                <Text style={styles.tableCell}>
                  {sensor.frequency || "N/A"}
                </Text>
                <Text style={styles.tableCell}>
                  {sensor.productionBatch || "N/A"}
                </Text>
              </View>
            ))
          ) : (
            <View style={styles.tableRow}>
              <Text
                style={[styles.tableCell, { textAlign: "center", flex: 4 }]}
              >
                No sensors in inventory
              </Text>
            </View>
          )}
        </View>

        {/* Component Stock Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}> COMPONENT INVENTORY</Text>

          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCell, { flex: 2 }]}>Component Name</Text>
            <Text style={styles.tableCellCenter}>Qty</Text>
            <Text style={styles.tableCell}>Location</Text>
            <Text style={styles.tableCell}>Supplier</Text>
            <Text style={styles.tableCell}>Updated</Text>
          </View>

          {/* Table Rows */}
          {componentStock.length > 0 ? (
            componentStock.map((component, index) => (
              <View
                key={component.id}
                style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlt}
              >
                <Text style={[styles.tableCell, { flex: 2 }]}>
                  {component.name}
                </Text>
                <Text style={styles.tableCellCenter}>{component.quantity}</Text>
                <Text style={styles.tableCell}>{component.location}</Text>
                <Text style={styles.tableCell}>
                  {component.supplier || "N/A"}
                </Text>
                <Text style={styles.tableCell}>
                  {component.lastUpdated.toLocaleDateString()}
                </Text>
              </View>
            ))
          ) : (
            <View style={styles.tableRow}>
              <Text
                style={[styles.tableCell, { textAlign: "center", flex: 5 }]}
              >
                No components in inventory
              </Text>
            </View>
          )}
        </View>

        {/* Location Summary */}

        {/* Footer */}
        <Text style={styles.footer}>
          This report was automatically generated by the Senzemo Inventory
          Management System | Report ID: INV-{reportDate.getTime()}
        </Text>
      </Page>
    </Document>
  );
};

export default InventoryReport;
