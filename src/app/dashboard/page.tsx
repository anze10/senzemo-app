import { getCurrentSession } from "~/server/LOGIN_LUCIA_ACTION/session";
import Dashboard from "./components/Buttonic";
import { redirect } from "next/dist/client/components/navigation";
import Navbar from "../components/navabar";

export default async function Home() {
  const { user } = await getCurrentSession();
  if (user === null) {

    return redirect("/");
  }
  console.log("User is logged in:", user);
  return (
    <>
      <Navbar />
      <Dashboard />
    </>
  );
}
