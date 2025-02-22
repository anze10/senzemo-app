import { ParsedSensorData } from "./Choose_parser";

export default function SMC30_parser(input: Uint8Array) {
  const result: ParsedSensorData = new Object() as ParsedSensorData;

  console.log("Parse:", input);
  console.log("length:", input.length);

  try {
    result.family_id = input[0];
    result.product_id = input[1];
    result.device_device_hw_ver = input[2] / 10;
    result.device_fw_ver = input[3] / 10;

    result.dev_eui = Array.from(input.slice(8, 16))
      .map((byte) => byte.toString(16).padStart(2, "0").toUpperCase())
      .join("");

    result.join_eui = Array.from(input.slice(16, 24))
      .map((byte) => byte.toString(16).padStart(2, "0").toUpperCase())
      .join("");
    result.app_key = Array.from(input.slice(24, 40))
      .map((byte) => byte.toString(16).padStart(2, "0").toUpperCase())
      .join("");

    result.lora_dr_adr_en = input[40];

    const freq_reg = input[41];
    if (freq_reg === 4) {
      result.lora_freq_reg = "EU868";
    } else if (freq_reg === 8) {
      result.lora_freq_reg = "US915";
    } else if (freq_reg === 0) {
      result.lora_freq_reg = "AS923";
    }

    result.lora_hyb_asoff_mask0_1 = input[42];
    result.lora_mask2_5 = input[43];
    result.lora_send_period = input[44];
    result.lora_ack = input[45];
    result.device_mov_thr = input[46];
    result.device_adc_en = input[47];
    result.device_adc_delay = (input[48] << 16) | (input[49] << 8);
    // const bit50 = input[50].toString(2).padStart(8, "0");

    result.device_status = input[51];
    result.temperature = input[52];
    result.humidity = input[53];
    result.air_pressure = (input[56] << 8) | input[57];
  } catch (error) {
    console.error("Error parsing data: ", error);
  }
  console.log(JSON.stringify(result));
  return result;
}
