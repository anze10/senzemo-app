import type { SensorParserCombinator } from "./ParseSensorData";
import type { Senzor } from "@prisma/client";

export function RightDecoder(
  data: Uint8Array,
  sensors: Senzor[],
): SensorParserCombinator | undefined {
  console.log("Data received for decoder search:", data);
  try {
    console.log("Finding right decoder for data:", data[0], data[1]);
    const right_decoder = sensors.find(
      (sensor) => sensor.familyId === data[0] && sensor.productId === data[1],
    );
    if (right_decoder) {
      console.log("right decoder from database", right_decoder.decoder);
      if (typeof right_decoder.decoder === "object") {
        return right_decoder.decoder as SensorParserCombinator;
      }
    }
  } catch (error) {
    console.error("Error finding right decoder:", error);
  }
  return undefined;
}

export function getZplForSensor(
  devEui: string,
  sensors: Senzor[],
  family_id: number,
  product_id: number,
  frequency_region: string,
): string {
  const ZPL_TEMPLATE = sensors.find(
    (sensor) =>
      sensor.familyId === family_id && sensor.productId === product_id,
  );
  if (ZPL_TEMPLATE) {
    console.log("right decoder from database", ZPL_TEMPLATE.zpl);
    if (typeof ZPL_TEMPLATE.zpl === "string") {
      return ZPL_TEMPLATE.zpl
        .replace("{devEui}", devEui)
        .replace("{frequencyRegion}", frequency_region);
    }
  }
  return `^XA^FO50,50^A0N,50,50^FD${devEui}^FS^XZ`;
}
