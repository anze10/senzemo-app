"use cache"
import { prisma } from "~/server/DATABASE_ACTION/prisma"
import { SensorParserCombinator } from "./ParseSensorData";

export async function getData() {

    const data = await prisma.senzor.findMany();
    console.log('data from database', data);
    return data;
}

export async function RightDecoder(data: Uint8Array): Promise<SensorParserCombinator | undefined> {
    const decoders = await getData();

    if (data[0] == 1 && data[1] == 1) {
        const right_decoder = decoders.find(decoder => decoder.familyId === 1 && decoder.productId === 1);
        console.log('right decoder from database', right_decoder?.decoder);

        // Assuming the `decoder` field is already of type `SensorParserCombinator`
        if (right_decoder?.decoder && typeof right_decoder.decoder !== 'string') {
            return right_decoder.decoder as SensorParserCombinator;
        }
        return undefined;
    }
}