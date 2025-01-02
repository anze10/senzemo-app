"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@radix-ui/react-tabs";
import { SensorManagement } from "./Senzorji/Sensors";
// import { OrderManagement } from "./order-management";
// import { Statistics } from "./statistics";
import { Card, CardContent } from "@mui/material";
import { Settings, LayoutGrid, BarChart2 } from "lucide-react";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("sensors");

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        {/* Tabs Wrapper */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab} // Updates the active tab state on click
          orientation="vertical"
          className="flex w-full"
        >
          {/* Sidebar */}
          <div className="w-64 border-r bg-muted/40 min-h-screen">
            <div className="p-6">
              <h1 className="text-2xl font-semibold text-foreground mb-6">Admin Console</h1>
              <TabsList className="flex flex-col h-full bg-transparent space-y-2">
                <TabsTrigger
                  value="sensors"
                  className="w-full justify-start gap-3 px-3 py-2 text-muted-foreground data-[state=active]:text-foreground"
                >
                  <Settings className="h-4 w-4" />
                  Sensors
                </TabsTrigger>
                <TabsTrigger
                  value="orders"
                  className="w-full justify-start gap-3 px-3 py-2 text-muted-foreground data-[state=active]:text-foreground"
                >
                  <LayoutGrid className="h-4 w-4" />
                  Orders
                </TabsTrigger>
                <TabsTrigger
                  value="statistics"
                  className="w-full justify-start gap-3 px-3 py-2 text-muted-foreground data-[state=active]:text-foreground"
                >
                  <BarChart2 className="h-4 w-4" />
                  Statistics
                </TabsTrigger>
              </TabsList>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 p-6">
            <Card className="border-none shadow-none bg-transparent">
              <CardContent className="p-0">
                <TabsContent value="sensors" className="m-0">
                  <SensorManagement />
                </TabsContent>
                <TabsContent value="orders" className="m-0">
                  {/* <OrderManagement /> */}
                </TabsContent>
                <TabsContent value="statistics" className="m-0">
                  {/* <Statistics /> */}
                </TabsContent>
              </CardContent>
            </Card>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
