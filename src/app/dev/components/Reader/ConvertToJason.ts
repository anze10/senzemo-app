"use server"
import { sensor_form_schema, SensorFormSchemaType } from "src/app/dev/components/Reader";



export default function SMC30_parser(input: string) {
    const store: SensorFormSchemaType = sensor_form_schema.parse({});

    console.log("Parse:", input);
    console.log("length:", input.length);

    try {
        store.family_id = parseInt(input.slice(0, 2));
        store.product_id = parseInt(input.slice(2, 4));
        store.device.hw_ver = parseInt(input.slice(4, 6), 16) / 10;
        store.device.fw_ver = parseInt(input.slice(6, 8), 16) / 10;

        store.dev_eui = input.slice(18, 34);
        store.join_eui = input.slice(34, 50);
        store.app_key = input.slice(50, 82);

        store.lora.dr_adr_en = parseInt(input.slice(82, 84), 16);

        const freq_reg = parseInt(input.slice(84, 86), 16);
        if (freq_reg === 4) {
            store.lora.freq_reg = "EU868";
        } else if (freq_reg === 8) {
            store.lora.freq_reg = "US915";
        } else if (freq_reg === 0) {
            store.lora.freq_reg = "AS923";
        }
        //
        store.lora.hyb_asoff_mask0_1 = parseInt(input.slice(86, 88), 16);
        store.lora.mask2_5 = parseInt(input.slice(88, 90), 16);
        store.lora.send_period = parseInt(input.slice(90, 92), 16);
        store.lora.ack = parseInt(input.slice(92, 94), 16);
        store.device.mov_thr = parseInt(input.slice(94, 96), 16);
        store.device.adc_en = parseInt(input.slice(96, 98), 16);
        store.device.adc_delay = parseInt(input.slice(98, 104), 16);

        store.device.status = parseInt(input.slice(106, 108), 16);
        store.temperature = parseInt(input.slice(108, 110), 16);
        store.humidity = parseInt(input.slice(110, 112), 16);
        // store.air_pressure = parseInt(input.slice(112, 116), 16);
    } catch (error) {
        console.error("Error parsing data: ", error);
    }

    return store;

}





