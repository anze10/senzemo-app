//import { getCurrentSession } from "~/server/session";
import Dashboard from "./components/Buttonic";

export default async function Home() {
  // const { user } = await getCurrentSession();
  // if (user === null) {
  //     return redirect("/");
  // }
  return (
    <>
      <Dashboard />
    </>
  );
}
