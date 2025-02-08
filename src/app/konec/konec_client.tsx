"use client";

import { useRouter } from "next/navigation";
import { useSensorStore } from "../dev/components/SensorStore";
import { useCallback } from "react";
import { insert } from "~/server/GAPI_ACTION/create_folder";
import { useGoogleIDSstore } from "../parametrs/components/Credentisal";
//import { string } from "zod";

export function Konec() {
  const credentials = useGoogleIDSstore((state) => state.set_data);
  const sensor_data = useSensorStore((state) => state.sensors);
  const resetStore = useSensorStore((state) => state.reset);
  const custom_FW = "N/A";

  const lorawan_version = "RP001_V1_0_3_REV_A";

  const router = useRouter();

  const posli = useCallback(async () => {
    let newRowCSV = [];
    let newROWEXE = [];
    for (const element of sensor_data) {
      if (element.okay) {
        let model_id = "";
        let device_name = "";
        let frequancy_plan_id = "";
        let band_id = "";
        switch (element?.data.family_id) {
          case 1:
            model_id = "SMC30";
            device_name = "Senstick Microclimate";

            break;
          case 2:
            model_id = "SSM40";
            break;
          case 3:
            model_id = "SXX3.6";

            break;
        }
        switch (element?.data.lora.freq_reg) {
          case "AS923":
            frequancy_plan_id = "AS_920_923_TTN_AU";
            band_id = "AS_923";
            break;
          case "EU868":
            frequancy_plan_id = "EU_863_870_TTN";
            band_id = "EU_863_870";
            break;
          case "US915":
            frequancy_plan_id = "US_902_928_FSB_2";
            band_id = "US_902_928";
            break;
        }
        newRowCSV = [
          model_id + "-" + element?.data.dev_eui,
          element?.data.dev_eui,
          element?.data.join_eui,
          device_name,
          frequancy_plan_id,
          lorawan_version,
          "unknown",
          element?.data.app_key,
          "Senzemo",
          model_id,
          element?.data.device.hw_ver,
          element?.data.device.fw_ver,
          band_id,
        ];
        newROWEXE = [
          model_id,
          element?.data.dev_eui,
          element?.data.app_key,
          element?.data.join_eui,
          element?.data.lora.freq_reg,
          "FSB2",
          element?.data.device.hw_ver,
          element?.data.device.fw_ver,
          custom_FW,
          element?.data.lora.send_period,
          element?.data.device.adc_delay,
          element?.data.device.mov_thr,
        ];
        if (!credentials?.fileId) {
          throw new Error("No credentials");
        }
        void insert(
          credentials?.fileId,
          newRowCSV as string[],
          credentials?.spreadsheetId,
          newROWEXE as string[]
        );
      }
    }
  }, [sensor_data, credentials?.fileId, credentials?.spreadsheetId]);

  return (
    <div>
      <h1>Konec</h1>
      <pre>{JSON.stringify(sensor_data, null, 2)}</pre>
      <pre>{JSON.stringify(credentials, null, 2)}</pre>

      <button onClick={() => posli()}>Pošlji</button>
      <button
        onClick={() => {
          resetStore();
          router.push("/parametrs");
        }}
      >
        test
      </button>
    </div>
  );
}
