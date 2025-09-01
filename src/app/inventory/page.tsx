import Izhod from "./components/Izhod";
import { getCurrentSession } from "~/server/LOGIN_LUCIA_ACTION/session";
import { redirect } from "next/dist/client/components/navigation";
import Navbar from "../components/navabar";

export default async function Home() {
  const { user } = await getCurrentSession();
  if (user === null) {
    return redirect("/");
  }
  return (
    <>
      <Navbar />
      <Izhod />
    </>
  );
}



