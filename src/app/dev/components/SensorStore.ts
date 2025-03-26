import { create, type StateCreator } from "zustand";
import { produce } from "immer";
import { persist, createJSONStorage } from "zustand/middleware";
//import SMC30_parser from "./Reader/SMC30_Parser";
import {
  ParsedSensorData,
  ParseSensorData,
  SensorParserCombinator,
} from "./Reader/ParseSensorData";

export type RatedSensorData = {
  data: ParsedSensorData;
  okay?: boolean;
};

// current_sensor.data === target_sensor_data
interface SensorState {
  current_decoder: SensorParserCombinator;
  current_sensor_index: number;
  target_sensor_data?: ParsedSensorData;
  sensors: RatedSensorData[];
  time: number; // Time in milliseconds
  reset: () => void;
  set_target_sensor_data: (data: ParsedSensorData) => void;
  add_new_sensor: (decoder: SensorParserCombinator, data: Uint8Array) => void;
  set_current_sensor_index: (new_index: number) => void;
  set_sensor_status: (sensor_number: number, okay: boolean) => void;
  set_sensor_data: (sensor_number: number, data: ParsedSensorData) => void;
  set_time: (time: number) => void;
}

const initial_state = {
  current_sensor_index: 0,
  time: 0,
  sensors: [],
};

const sensor_callback: StateCreator<SensorState> = (set) => ({
  ...initial_state,
  target_sensor_data: undefined,
  current_decoder: [],
  reset: () => {
    set(() => initial_state);
  },
  set_target_sensor_data: (data: Partial<ParsedSensorData>) => {
    set(
      produce((state: SensorState) => {
        state.target_sensor_data = data;
      })
    );
  },
  add_new_sensor: async (decoder, data) => {
    const parsed_data = ParseSensorData(decoder, data);

    /* const { common_data, custom_data } =
      split_common_custom_sensor_data(parsed_data);

    const new_data: SensorData = {
      common_data,
      custom_data,
    }; */

    console.log("Adding new sensor:", parsed_data);
    set(
      produce((state: SensorState) => {
        state.sensors.push({ data: parsed_data });
        state.current_decoder = decoder;

        state.current_sensor_index = state.sensors.length - 1;
      })
    );
  },
  set_current_sensor_index: (new_index: number) =>
    set({ current_sensor_index: new_index }),
  set_sensor_status: (sensor_number, okay) => {
    set(
      produce((state: SensorState) => {
        const this_sensor = state.sensors[sensor_number];
        if (!this_sensor) return;

        this_sensor.okay = okay;
      })
    );
  },
  set_sensor_data: (sensor_number, data) => {
    set(
      produce((state: SensorState) => {
        const this_sensor = state.sensors[sensor_number];
        if (!this_sensor) return;

        this_sensor.data = data;
      })
    );
  },
  set_time: (time: number) => set({ time }),
});

export const useSensorStore = create<SensorState>()(
  persist(sensor_callback, {
    name: "sensor-store",
    storage: createJSONStorage(() => localStorage),
  })
);
