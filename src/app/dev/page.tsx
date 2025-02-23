//import Reader from "./components/Reader";

import Navbar from "./components/Navbar";
import { SensorCheckForm } from "./components/SensorCheckForm";

export default async function Home() {
  return (
    <div>
      <Navbar />
      <SensorCheckForm />
    </div>
  );
}
