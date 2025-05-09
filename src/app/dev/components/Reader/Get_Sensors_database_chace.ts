import { SensorParserCombinator } from "./ParseSensorData";
import { Senzor } from "@prisma/client";

export function RightDecoder(
  data: Uint8Array,
  sensors: Senzor[]
): SensorParserCombinator | undefined {
  if (data[0] == 1 && data[1] == 1) {
    const right_decoder = sensors.find(
      (sensor) => sensor.familyId === 1 && sensor.productId === 1
    );
    console.log("right decoder from database", right_decoder?.decoder);


    if (typeof right_decoder?.decoder === "object") {
      return right_decoder.decoder as SensorParserCombinator;
    }
    return undefined;
  }
}
