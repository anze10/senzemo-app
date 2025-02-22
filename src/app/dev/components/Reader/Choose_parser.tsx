export type ParsedSensorEnum = string[];
export type ParsedSensorValue = string | number | boolean | ParsedSensorEnum;
export type ParsedSensorData = Record<string, ParsedSensorValue>;

export type SensorParserCombinator = SensorParser[];

export type SensorParser = {
  input: {
    byte_position: number;
    byte_length: number;
  };
  output: NumberOutput | EnumOutput | StringOutput;
};

type NumberOutput = {
  type: "number";
  name: string;
  default: number;
  scale?: number;
  important?: boolean;
};

type EnumOutput = {
  type: "enum";
  name: string;
  enum_values: Array<{ value: number; mapped: string }>;
  default: string;
  important?: boolean;
};

type StringOutput = {
  type: "string";
  name: string;
  format: "hex";
  default: string;
  important?: boolean;
};

// combinators: dobis iz baze podatkov
export function ParseSensorData(
  combinators: SensorParserCombinator,
  buffer: Uint8Array
): ParsedSensorData {
  const result: ParsedSensorData = {};

  for (const parser of combinators) {
    const { byte_position, byte_length } = parser.input;
    const output = parser.output;
    let value: ParsedSensorValue | undefined = output.default;

    try {
      if (output.type === "string" && output.format === "hex") {
        // For hex conversion, we simply slice out the bytes.
        const startByte = byte_position;
        const bytes = buffer.slice(startByte, startByte + byte_length);
        value = Array.from(bytes)
          .map((b) => b.toString(16).padStart(2, "0").toUpperCase())
          .join("");
      } else {
        // For numeric/enum values, read the bytes as a big-endian number.
        const fieldBytes = buffer.slice(
          byte_position,
          byte_position + byte_length
        );
        let rawValue = 0;
        for (const b of fieldBytes) {
          rawValue = (rawValue << 8) | b;
        }

        if (output.type === "number") {
          value = rawValue;
          if (output.scale) {
            value = Number((rawValue * output.scale).toFixed(2));
          }
        } else if (output.type === "enum") {
          const matched = output.enum_values.find((e) => e.value === rawValue);
          value = matched ? matched.mapped : output.default;
        }
      }
    } catch (error) {
      console.error(`Error parsing ${output.name}:`, error);
      value = output.default;
    }

    result[output.name] = value;
  }

  return result;
}
