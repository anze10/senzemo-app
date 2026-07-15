"use client";
//import { OrderManagement } from "./components/OrderManagement";
import dynamic from "next/dynamic";

const OrderManagement = dynamic(() => import("./OrderManagement"), {
  ssr: false,
});

export default function Test() {
  return (
    <div>
      <OrderManagement />
    </div>
  );
}
