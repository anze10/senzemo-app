import { create, type StateCreator } from "zustand";
import { produce } from "immer";
import { persist, createJSONStorage } from "zustand/middleware";
import { parsed_sensor_schema, type SensorFormSchemaType } from "./Reader";

export type SensorData = {
  common_data: SensorFormSchemaType;
  custom_data?: Record<string, unknown>;

};

export type RatedSensorData = {
  data: SensorData;
  okay?: boolean;
};

// current_sensor.data === default_sensor_data
interface SensorState {
  current_sensor_index: number;
  default_sensor_data?: Partial<SensorFormSchemaType>;
  sensors: RatedSensorData[];
  reset: () => void;
  set_default_sensor_data: (data: Partial<SensorFormSchemaType>) => void;
  add_new_sensor: (data: string) => void;
  set_current_sensor_index: (new_index: number) => void;
  set_sensor_status: (sensor_number: number, okay: boolean) => void;
  set_common_sensor_data: (
    sensor_number: number,
    common_data: SensorData["common_data"],
  ) => void;
  set_custom_sensor_data: (
    sensor_number: number,
    custom_data: SensorData["custom_data"],
  ) => void;
}

const initial_state = {
  current_sensor_index: 0,
  sensors: [],
};

type ParsedDataType = SensorFormSchemaType & Record<string, unknown>;
const sensor_callback: StateCreator<SensorState> = (set) => ({
  ...initial_state,
  default_sensor_data: undefined,
  reset: () => {
    set(() => initial_state);
  },
  set_default_sensor_data: (data: Partial<SensorData["common_data"]>) => {
    set(
      produce((state: SensorState) => {
        state.default_sensor_data = data;
      })
    );
  },
  add_new_sensor: (data) => {
    const parsed_data = JSON.parse(data) as ParsedDataType;

    const { common_data, custom_data } =
      split_common_custom_sensor_data(parsed_data);

    const new_data: SensorData = {
      common_data,
      custom_data,
    };

    console.log("Adding new sensor:", new_data);
    set(
      produce((state: SensorState) => {
        state.sensors.push({
          data: new_data,
        });

        state.current_sensor_index = state.sensors.length - 1;
      }),
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
      }),
    );
  },
  set_common_sensor_data: (sensor_number, common_data) => {
    set(
      produce((state: SensorState) => {
        const this_sensor = state.sensors[sensor_number];
        if (!this_sensor) return;

        this_sensor.data.common_data = common_data;
      }),
    );
  },
  set_custom_sensor_data: (sensor_number, custom_data) => {
    set(
      produce((state: SensorState) => {
        const this_sensor = state.sensors[sensor_number];
        if (!this_sensor) return;

        this_sensor.data.custom_data = custom_data;
      }),
    );
  },
});

export const useSensorStore = create<SensorState>()(
  persist(sensor_callback, {
    name: "sensor-store",
    storage: createJSONStorage(() => localStorage),
  }),
);

export enum SensorModel {
  SMC30,
  SSM40,
  STO10,
  STP40,
  SLW10,
  SRM10,
  STF40,
  KOU20,
  SPU10,
}

export function split_common_custom_sensor_data(parsed_data: ParsedDataType): {
  common_data: SensorFormSchemaType;
  custom_data: Record<string, unknown>;
} {
  const parsed_data_keys = Object.keys(parsed_data);

  const common_data: Partial<SensorFormSchemaType> = new Object();
  const custom_data: Record<string, unknown> = {};

  for (const key of parsed_data_keys) {
    const value = parsed_data[key];
    if (key in parsed_sensor_schema.keys) {
      const hack = common_data as Record<string, unknown>;
      hack[key] = value;
    } else {
      custom_data[key] = value;
    }
  }


  console.log("Parsed data:", { parsed_data, common_data, custom_data });
  for (const key of Object.keys(parsed_sensor_schema.keys)) {
    if (!(key in common_data)) {
      console.log(`Missing key ${key} in parsed data`);

    }
  }

  return {
    common_data: common_data as SensorFormSchemaType,
    custom_data,
  };
}
