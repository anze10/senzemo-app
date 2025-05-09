import { create, type StateCreator } from "zustand";
import { produce } from "immer";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  ParsedSensorData,
  ParseSensorData,
  SensorParserCombinator,
} from "./Reader/ParseSensorData";

export type RatedSensorData = {
  data: ParsedSensorData;
  okay?: boolean;
};


export interface SensorState {
  current_decoder: SensorParserCombinator;
  current_sensor_index: number;
  target_sensor_data?: ParsedSensorData;
  sensors: RatedSensorData[];
  start_time: number;
  end_time: number;
  reset: () => void;
  set_target_sensor_data: (data: ParsedSensorData) => void;
  add_new_sensor: (decoder: SensorParserCombinator, data: Uint8Array) => void;
  set_current_sensor_index: (new_index: number) => void;
  set_sensor_status: (sensor_number: number, okay: boolean) => void;
  set_sensor_data: (sensor_number: number, data: ParsedSensorData) => void;
  // set_time: (start_time: number) => void;
}

const initial_state = {
  current_sensor_index: 0,
  start_time: 0,
  end_time: 0,
  sensors: [],
} satisfies Partial<SensorState>;

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
});

export const useSensorStore = create<SensorState>()(
  persist(sensor_callback, {
    name: "sensor-store",
    storage: createJSONStorage(() => localStorage),
  })
);
