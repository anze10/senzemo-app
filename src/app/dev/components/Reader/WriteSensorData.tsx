import type { ParsedSensorData, SensorParserCombinator } from "./ParseSensorData";

export function EncodeSensorData(
    parsers: SensorParserCombinator,
    data: ParsedSensorData
): Uint8Array {
    console.log("EncodeSensorData called with:", { parsers, data });

    if (!parsers || !parsers.length) {
        console.error("No parsers provided to EncodeSensorData");
        throw new Error("No sensor configuration available");
    }

    if (!data || Object.keys(data).length === 0) {
        console.error("No data provided to EncodeSensorData");
        throw new Error("No sensor data available");
    }

    // Determine buffer size
    const bytePositions = parsers.map((p) => p.input.byte_position + p.input.byte_length);
    if (bytePositions.length === 0) {
        console.error("No valid byte positions in parsers");
        throw new Error("Invalid sensor configuration");
    }

    const maxPosition = Math.max(...bytePositions);
    if (maxPosition <= 0) {
        console.error("Invalid buffer size calculated:", maxPosition);
        throw new Error("Invalid sensor data format");
    }

    const buffer = new Uint8Array(maxPosition).fill(0);
    console.log("Buffer size:", maxPosition, "Buffer:", buffer);

    for (const parser of parsers) {
        const { byte_position, byte_length } = parser.input;
        const {
            name,
            type,
            default: defaultValue,
            format,
            enum_values,
            scale
        } = parser.output;

        const value = data[name] ?? defaultValue;
        console.log(`Processing field ${name}: value=${value}, type=${type}, position=${byte_position}, length=${byte_length}`);

        try {
            switch (type) {
                case "number": {
                    let numericValue = Number(value);
                    if (scale) numericValue = numericValue / scale;
                    numericValue = Math.round(numericValue);
                    console.log(`  Number field ${name}: ${value} -> ${numericValue}`);

                    for (let i = byte_length - 1; i >= 0; i--) {
                        buffer[byte_position + i] = numericValue & 0xFF;
                        numericValue = Math.floor(numericValue / 256);
                    }
                    break;
                }

                case "string": {
                    if (format === "hex") {
                        const hexStr = String(value).padStart(byte_length * 2, '0');
                        console.log(`  Hex string field ${name}: ${value} -> ${hexStr}`);
                        for (let i = 0; i < byte_length; i++) {
                            const byteStr = hexStr.substr(i * 2, 2);
                            buffer[byte_position + i] = parseInt(byteStr, 16);
                        }
                    } else {
                        console.log(`  String field ${name}: ${value}`);
                        const encoder = new TextEncoder();
                        const encoded = encoder.encode(String(value));
                        const bytes = new Uint8Array(byte_length).fill(0);
                        bytes.set(encoded.subarray(0, byte_length));
                        buffer.set(bytes, byte_position);
                    }
                    break;
                }

                case "enum": {
                    if (!enum_values) throw new Error("Missing enum_values for enum type");
                    const enumEntry = enum_values.find(e => e.mapped === value);
                    const enumValue = enumEntry?.value ?? Number(defaultValue);
                    console.log(`  Enum field ${name}: ${value} -> ${enumValue}`);
                    buffer[byte_position] = enumValue;
                    break;
                }

                case "boolean": {
                    const boolValue = value ? 1 : 0;
                    console.log(`  Boolean field ${name}: ${value} -> ${boolValue}`);
                    buffer[byte_position] = boolValue;
                    break;
                }
            }
        } catch (error) {
            console.error(`Error encoding field ${name}:`, error);
            // V primeru napake ohranimo privzeto vrednost
            if (typeof defaultValue === 'number') {
                for (let i = 0; i < byte_length; i++) {
                    buffer[byte_position + i] = Number(defaultValue) >> (8 * (byte_length - i - 1)) & 0xFF;
                }
            }
        }
    }
    console.log("Final encoded buffer:", buffer);
    return buffer;
}