export type ParsedSensorEnum = string[];
export type ParsedSensorValue =
  | string
  | number
  | boolean
  | ParsedSensorEnum
  | undefined;
export type ParsedSensorData = Record<string, ParsedSensorValue>;

type SensorParserInput = {
  byte_position: number;
  byte_length: number;
  byte_offset?: number; // Optional offset within the byte range
};

type SensorParserOutput = {
  type: "number" | "string" | "boolean" | "enum";
  name: string;
  default: ParsedSensorValue;
  important?: boolean;
  format?: "hex";
  enum_values?: { value: number; mapped: string }[];
  scale?: number;
};

export type SensorParser = {
  input: SensorParserInput;
  output: SensorParserOutput;
};

export type SensorParserCombinator = SensorParser[];

export function ParseSensorData(
  parsers: SensorParserCombinator,
  data: Uint8Array
): ParsedSensorData {
  const result: ParsedSensorData = {};

  for (const parser of parsers) {
    const { byte_position, byte_length, byte_offset = 0 } = parser.input;
    const {
      name,
      type,
      default: defaultValue,
      format,
      enum_values,
      scale,
    } = parser.output;

    try {
      const start = byte_position + Math.floor(byte_offset / 8);
      const end = start + byte_length;

      if (end > data.length) {
        result[name] = defaultValue;
        continue;
      }

      const bytes = data.slice(start, end);
      let value: ParsedSensorValue = defaultValue;

      switch (type) {
        case "number": {
          let numericValue = 0;
          for (let i = 0; i < bytes.length; i++) {
            numericValue = (numericValue << 8) | bytes[i];
          }
          value = scale ? numericValue * scale : numericValue;
          break;
        }

        case "string": {
          if (format === "hex") {
            value = Array.from(bytes)
              .map((byte) => byte.toString(16).padStart(2, "0").toUpperCase())
              .join("");
          } else {
            const decoder = new TextDecoder();
            value = decoder.decode(bytes);
          }
          break;
        }

        case "enum": {
          if (!enum_values)
            throw new Error("Missing enum_values for enum type");
          const numericValue = bytes[0]; // Assuming enum values are single-byte
          const enumEntry = enum_values.find((e) => e.value === numericValue);
          value = enumEntry?.mapped ?? defaultValue;
          break;
        }

        case "boolean": {
          value = bytes[0] !== 0;
          break;
        }
      }

      result[name] = value;
    } catch (error) {
      console.error(`Error parsing field ${name}:`, error);
      result[name] = defaultValue;
    }
  }
  console.log("Parsed data:", result);
  return result;
}

// Example usage:
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const exampleParser: SensorParserCombinator = [
  {
    input: { byte_position: 0, byte_length: 1 },
    output: { type: "number", name: "family_id", default: 0 },
  },
  {
    input: { byte_position: 2, byte_length: 1 },
    output: {
      type: "number",
      name: "device_device_hw_ver",
      default: 0,
      scale: 0.1,
    },
  },
  {
    input: { byte_position: 8, byte_length: 8 },
    output: {
      type: "string",
      name: "dev_eui",
      default: "",
      format: "hex",
    },
  },
  {
    input: { byte_position: 41, byte_length: 1 },
    output: {
      type: "enum",
      name: "lora_freq_reg",
      default: 4,
      enum_values: [
        { value: 4, mapped: "EU868" },
        { value: 8, mapped: "US915" },
        { value: 0, mapped: "AS923" },
      ],
    },
  },
];

// Usage with sample data:
// const sensorData = new Uint8Array(64); // Sample buffer
// const parsedData = ParseSensorData(exampleParser, sensorData);
