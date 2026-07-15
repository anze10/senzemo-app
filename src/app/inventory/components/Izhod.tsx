"use client";

import dynamic from "next/dynamic";

const InventoryManagementPage = dynamic(() => import("./InventoryManagement"), {
  ssr: false,
});

export default function Izhod() {
  return (
    <div>
      <InventoryManagementPage />
    </div>
  );
}
