interface InputConfig {
    pozicija_bita: number;
    dolzina_v_bitih: number;
}

interface OutputConfig {
    preberi_kot: "number" | "string" | "hex";
    zapisi_v_spremenljivko: string;
}

interface ConfigEntry {
    input: InputConfig;
    output: OutputConfig;
}

export default function universalParser(input: Uint8Array, config: ConfigEntry[]): string {
    const result: Record<string, { ime_parametra: string; vrednost_parametra: string | number }> = {};

    try {
        config.forEach((entry) => {
            const { input: inputConfig, output: outputConfig } = entry;
            const { pozicija_bita, dolzina_v_bitih } = inputConfig;
            const { preberi_kot, zapisi_v_spremenljivko } = outputConfig;

            // Izračun začetnega in končnega bajta
            const startByte = Math.floor(pozicija_bita / 8);
            const bitOffset = pozicija_bita % 8;
            const byteLength = Math.ceil((bitOffset + dolzina_v_bitih) / 8);

            // Pridobi relevantne bajte
            const rawBytes = input.slice(startByte, startByte + byteLength);

            let value: string | number = "";
            if (preberi_kot === "number") {
                value = rawBytes.reduce((acc, byte, index) => acc | (byte << (8 * index)), 0);
            } else if (preberi_kot === "string") {
                value = Array.from(rawBytes).map(byte => String.fromCharCode(byte)).join("");
            } else if (preberi_kot === "hex") {
                value = Array.from(rawBytes).map(byte => byte.toString(16).padStart(2, "0").toUpperCase()).join("");
            }

            result[zapisi_v_spremenljivko] = {
                ime_parametra: zapisi_v_spremenljivko,
                vrednost_parametra: value
            };
        });
    } catch (error) {
        console.error("Error parsing data:", error);
    }

    return JSON.stringify({ rez: result });
}
