import type { SensorParserCombinator } from "./ParseSensorData";
import type { Senzor } from "@prisma/client";

export function RightDecoder(
  data: Uint8Array,
  sensors: Senzor[],
): SensorParserCombinator | undefined {
  try {
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
