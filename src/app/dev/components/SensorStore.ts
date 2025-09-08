import { create, type StateCreator } from "zustand";
import { produce } from "immer";
import { persist } from "zustand/middleware";
//import SMC30_parser from "./Reader/SMC30_Parser";
import {
  type ParsedSensorData,
  ParseSensorData,
  type SensorParserCombinator,
} from "./Reader/ParseSensorData";
import { createSafeStorage } from "~/lib/storage";

// Utility function to get a unique identifier for a sensor
export function getSensorUniqueId(sensorData: ParsedSensorData): string | null {
  // Primary identifier: dev_eui
  if (sensorData.dev_eui && typeof sensorData.dev_eui === "string") {
    return sensorData.dev_eui;
  }

  // Fallback: combination of family_id and product_id and other identifiers
  const family_id = sensorData.family_id;
  const product_id = sensorData.product_id;
  const hw_version = sensorData.hw_version || sensorData.device_hw_ver;

  if (family_id && product_id) {
    return `${family_id}-${product_id}${hw_version ? `-${hw_version}` : ""}`;
  }

  return null;
}

// Utility function to check if two sensors are the same
export function areSensorsEqual(
  sensor1: ParsedSensorData,
  sensor2: ParsedSensorData,
): boolean {
  const id1 = getSensorUniqueId(sensor1);
  const id2 = getSensorUniqueId(sensor2);

  if (id1 && id2) {
    return id1 === id2;
  }

  return false;
}

// Utility function to check if sensor data has actually changed
export function areSensorDataEqual(
  data1: ParsedSensorData,
  data2: ParsedSensorData,
): boolean {
  // Compare all data fields to see if anything has changed
  const keys1 = Object.keys(data1);
  const keys2 = Object.keys(data2);

  if (keys1.length !== keys2.length) {
    return false;
  }

  for (const key of keys1) {
    if (data1[key] !== data2[key]) {
      return false;
    }
  }

  return true;
}

// Utility function to validate that we have actual sensor data
export function validateSensorData(data: ParsedSensorData): boolean {
  // Check if this looks like valid sensor data rather than default/empty values

  // If we have a dev_eui that's not empty/default, it's likely valid
  if (
    data.dev_eui &&
    typeof data.dev_eui === "string" &&
    data.dev_eui.trim() !== "" &&
    data.dev_eui !== "0"
  ) {
    return true;
  }

  // Check for family_id and product_id that aren't default values
  if (
    data.family_id &&
    data.product_id &&
    typeof data.family_id === "number" &&
    typeof data.product_id === "number" &&
    data.family_id !== 0 &&
    data.product_id !== 0
  ) {
    // Additional check: make sure we have some actual sensor readings beyond just basic info
    const dataKeys = Object.keys(data);
    const nonBasicKeys = dataKeys.filter(
      (key) =>
        !["family_id", "product_id", "hw_version", "device_hw_ver"].includes(
          key,
        ),
    );

    // If we have additional data beyond basic device info, it's likely valid
    if (nonBasicKeys.length > 0) {
      return true;
    }
  }

  // If data appears to be all default/empty values, consider it invalid
  return false;
}

export type RatedSensorData = {
  data: ParsedSensorData;
  okay?: boolean;
};

// current_sensor.data === target_sensor_data
export interface SensorState {
  current_decoder: SensorParserCombinator;
  current_sensor_index: number;
  target_sensor_data?: ParsedSensorData;
  sensors: RatedSensorData[];
  OrderID: number | null; // Optional Order ID for the current sensor data
  start_time: number; // Time in milliseconds
  end_time: number; // Time in milliseconds
  reset: () => void;
  set_target_sensor_data: (data: ParsedSensorData) => void;
  add_new_sensor: (decoder: SensorParserCombinator, data: Uint8Array) => void;
  set_current_sensor_index: (new_index: number) => void;
  set_sensor_status: (sensor_number: number, okay: boolean) => void;
  set_sensor_data: (sensor_number: number, data: ParsedSensorData) => void;
  set_order_id: (orderId: number | null) => void;
  remove_duplicate_sensors: () => void;
  remove_sensor: (sensor_index: number) => void;
  validate_sensor_uniqueness: () => {
    isUnique: boolean;
    duplicates: Array<{ index: number; uniqueId: string; count: number }>;
  };
  // set_time: (start_time: number) => void;
}

const initial_state = {
  current_sensor_index: 0,
  start_time: 0,
  end_time: 0,
  OrderID: null,
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
      }),
    );
  },
  set_order_id: (orderId: number | null) => {
    set(
      produce((state: SensorState) => {
        state.OrderID = orderId;
      }),
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

    // Validate that we have actual sensor data and not just default/empty values
    const hasValidSensorData = validateSensorData(parsed_data);

    if (!hasValidSensorData) {
      console.log(
        "No valid sensor data detected - sensor may not be present on reader",
      );
      return; // Don't add/update anything if no valid sensor is detected
    }

    set(
      produce((state: SensorState) => {
        // Check for uniqueness using the utility function
        const newSensorId = getSensorUniqueId(parsed_data);

        if (newSensorId) {
          // Check if a sensor with this unique ID already exists
          const existingIndex = state.sensors.findIndex((sensor) => {
            const existingId = getSensorUniqueId(sensor.data);
            return existingId === newSensorId;
          });

          if (existingIndex !== -1) {
            console.log(
              `Sensor with unique ID ${newSensorId} already exists at index ${existingIndex}`,
            );

            // Check if the data has actually changed
            const existingSensor = state.sensors[existingIndex];
            if (
              existingSensor &&
              !areSensorDataEqual(existingSensor.data, parsed_data)
            ) {
              console.log("Sensor data has changed, updating existing sensor");
              existingSensor.data = parsed_data;
              state.current_sensor_index = existingIndex;
              state.current_decoder = decoder;
            } else {
              console.log("Sensor data unchanged, not updating display");
              // Don't change current_sensor_index if data hasn't changed
            }
            return;
          }
        }

        // If no duplicate found or no unique ID available, add as new sensor
        state.sensors.push({ data: parsed_data });
        state.current_decoder = decoder;
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
  set_sensor_data: (sensor_number, data) => {
    set(
      produce((state: SensorState) => {
        const this_sensor = state.sensors[sensor_number];
        if (!this_sensor) return;

        this_sensor.data = data;
      }),
    );
  },
  remove_duplicate_sensors: () => {
    set(
      produce((state: SensorState) => {
        const seen = new Set<string>();
        const uniqueSensors: RatedSensorData[] = [];

        state.sensors.forEach((sensor, index) => {
          const sensorId = getSensorUniqueId(sensor.data);

          if (sensorId) {
            if (!seen.has(sensorId)) {
              seen.add(sensorId);
              uniqueSensors.push(sensor);
            } else {
              console.log(
                `Removing duplicate sensor at index ${index} with unique ID: ${sensorId}`,
              );
            }
          } else {
            // Keep sensors without a unique ID (shouldn't happen in normal cases)
            // But give them a fallback based on their index to avoid removing valid data
            console.warn(
              `Sensor at index ${index} has no unique identifier, keeping it anyway`,
            );
            uniqueSensors.push(sensor);
          }
        });

        const originalLength = state.sensors.length;
        state.sensors = uniqueSensors;

        // Adjust current_sensor_index if necessary
        if (state.current_sensor_index >= state.sensors.length) {
          state.current_sensor_index = Math.max(0, state.sensors.length - 1);
        }

        console.log(
          `Removed ${originalLength - state.sensors.length} duplicate sensors`,
        );
      }),
    );
  },
  remove_sensor: (sensor_index: number) => {
    set(
      produce((state: SensorState) => {
        if (sensor_index < 0 || sensor_index >= state.sensors.length) {
          console.warn(`Invalid sensor index: ${sensor_index}`);
          return;
        }

        const removedSensor = state.sensors[sensor_index];
        console.log(
          `Removing sensor at index ${sensor_index} with dev_eui: ${removedSensor?.data.dev_eui}`,
        );

        state.sensors.splice(sensor_index, 1);

        // Adjust current_sensor_index if necessary
        if (state.current_sensor_index >= sensor_index) {
          state.current_sensor_index = Math.max(
            0,
            state.current_sensor_index - 1,
          );
        }
      }),
    );
  },
  validate_sensor_uniqueness: () => {
    const state = useSensorStore.getState();
    const idCounts = new Map<
      string,
      Array<{ index: number; sensor: RatedSensorData }>
    >();

    // Count occurrences of each unique ID
    state.sensors.forEach((sensor, index) => {
      const uniqueId = getSensorUniqueId(sensor.data);
      if (uniqueId) {
        if (!idCounts.has(uniqueId)) {
          idCounts.set(uniqueId, []);
        }
        idCounts.get(uniqueId)?.push({ index, sensor });
      }
    });

    // Find duplicates
    const duplicates: Array<{
      index: number;
      uniqueId: string;
      count: number;
    }> = [];

    idCounts.forEach((instances, uniqueId) => {
      if (instances.length > 1) {
        instances.forEach(({ index }) => {
          duplicates.push({ index, uniqueId, count: instances.length });
        });
      }
    });

    const isUnique = duplicates.length === 0;

    console.log(
      `Sensor uniqueness validation: ${isUnique ? "PASSED" : "FAILED"}`,
    );
    if (!isUnique) {
      console.log(`Found ${duplicates.length} duplicate sensors:`, duplicates);
    }

    return { isUnique, duplicates };
  },
  // set_time: (start_time: number) => set({ start_time }),
});

export const useSensorStore = create<SensorState>()(
  persist(sensor_callback, {
    name: "sensor-store",
    storage: createSafeStorage(),
  }),
);
