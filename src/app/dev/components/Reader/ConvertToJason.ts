"use server"
import { sensor_form_schema, SensorFormSchemaType } from "./Reader";
export functon ConvertToJon(data: string) {
    const hex = data;
    const useFuldata: SensorFormSchemaType = {
        sensor_name: hex.slice(0, 2),
        sensor_type: hex.slice(2, 4),
        sensor_id: hex.slice(4, 8),
        sensor_data: hex.slice(8, 12),
        sensor_status: hex.slice(12, 14),
        sensor_timestamp: hex.slice(14, 22),
    };
}


