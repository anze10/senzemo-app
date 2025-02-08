import { SensorFormSchemaType } from "src/app/dev/components/Reader";

export default function SMC30_parser(input: Uint8Array) {
  const store: SensorFormSchemaType = {
    family_id: 0,
    product_id: 0,
    device: {
      hw_ver: 0,
      fw_ver: 0,
      mov_thr: 0,
      adc_en: 0,
      adc_delay: 0,
      status: 0,
    },
    dev_eui: "",
    join_eui: "",
    app_key: "",
    lora: {
      dr_adr_en: 0,
      freq_reg: "",
      hyb_asoff_mask0_1: 0,
      mask2_5: 0,
      send_period: 0,
      ack: 0,
    },
    temperature: 0,
    humidity: 0,
    company_name: "",
  };

  console.log("Parse:", input);
  console.log("length:", input.length);

  try {
    store.family_id = input[0];
    store.product_id = input[1];
    store.device.hw_ver = input[2] / 10;
    store.device.fw_ver = input[3] / 10;

    store.dev_eui = Array.from(input.slice(8, 16))
      .map((byte) => byte.toString(16).padStart(2, "0").toUpperCase())
      .join("");

    store.join_eui = Array.from(input.slice(16, 24))
      .map((byte) => byte.toString(16).padStart(2, "0").toUpperCase())
      .join("");
    store.app_key = Array.from(input.slice(24, 40))
      .map((byte) => byte.toString(16).padStart(2, "0").toUpperCase())
      .join("");

    store.lora.dr_adr_en = input[40];

    const freq_reg = input[41];
    if (freq_reg === 4) {
      store.lora.freq_reg = "EU868";
    } else if (freq_reg === 8) {
      store.lora.freq_reg = "US915";
    } else if (freq_reg === 0) {
      store.lora.freq_reg = "AS923";
    }

    store.lora.hyb_asoff_mask0_1 = input[42];
    store.lora.mask2_5 = input[43];
    store.lora.send_period = input[44];
    store.lora.ack = input[45];
    store.device.mov_thr = input[46];
    store.device.adc_en = input[47];
    store.device.adc_delay = (input[48] << 16) | (input[49] << 8);
    // const bit50 = input[50].toString(2).padStart(8, "0");

    store.device.status = input[51];
    store.temperature = input[52];
    store.humidity = input[53];
    // store.air_pressure = (input[56] << 8) | input[57];
  } catch (error) {
    console.error("Error parsing data: ", error);
  }

  return store;
}
