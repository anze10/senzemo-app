import {
  sensor_form_schema,
  SensorFormSchemaType,
} from "src/app/dev/components/Reader";

export default function SMC30_parser(input: Uint8Array) {
  const store: SensorFormSchemaType = sensor_form_schema.parse({
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
  });

  console.log("Parse:", input);
  console.log("length:", input.length);

  try {
    store.family_id = input[0] * 10 + input[1];
    store.product_id = input[2] * 10 + input[3];
    store.device.hw_ver = input[4] / 10;
    store.device.fw_ver = input[5] / 10;

    store.dev_eui = Array.from(input.slice(9, 17)).map(byte => byte.toString(16).padStart(2, '0')).join('');
    store.join_eui = Array.from(input.slice(17, 25)).map(byte => byte.toString(16).padStart(2, '0')).join('');
    store.app_key = Array.from(input.slice(25, 41)).map(byte => byte.toString(16).padStart(2, '0')).join('');

    store.lora.dr_adr_en = input[41];

    const freq_reg = input[42];
    if (freq_reg === 4) {
      store.lora.freq_reg = "EU868";
    } else if (freq_reg === 8) {
      store.lora.freq_reg = "US915";
    } else if (freq_reg === 0) {
      store.lora.freq_reg = "AS923";
    }

    store.lora.hyb_asoff_mask0_1 = input[43];
    store.lora.mask2_5 = input[44];
    store.lora.send_period = input[45];
    store.lora.ack = input[46];
    store.device.mov_thr = input[47];
    store.device.adc_en = input[48];
    store.device.adc_delay = (input[49] << 16) | (input[50] << 8) | input[51];

    store.device.status = input[53];
    store.temperature = input[54];
    store.humidity = input[55];
    // store.air_pressure = (input[56] << 8) | input[57];
  } catch (error) {
    console.error("Error parsing data: ", error);
  }

  return store;
}
