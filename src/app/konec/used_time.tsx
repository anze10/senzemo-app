"use client";
import { Duration, formatDuration } from "date-fns";
import { Typography } from "@mui/material";
import { useSensorStore } from "../dev/components/SensorStore";
import { sl } from "date-fns/locale/sl";

export function get_used_time() {
  const { start_time, end_time } = useSensorStore.getState();
  const totalSeconds = (end_time - start_time) / 1000;
  let durationObj;
  let formatArr;

  if (totalSeconds >= 60) {
    durationObj = {
      minutes: Math.floor(totalSeconds / 60),
      seconds: Math.floor(totalSeconds % 60),
    };
    formatArr = ["minutes", "seconds"];
  } else {
    durationObj = {
      seconds: Math.floor(totalSeconds),
    };
    formatArr = ["seconds"];
  }

  return (
    <Typography>
      Porabljen čas:{" "}
      {formatDuration(durationObj, {
        format: formatArr as (keyof Duration)[],
        locale: sl,
      })}
    </Typography>
  );
}
