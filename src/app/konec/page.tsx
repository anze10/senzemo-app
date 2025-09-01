import { Konec } from "./konec_client";
import { getCurrentSession } from "~/server/LOGIN_LUCIA_ACTION/session";
import { redirect } from "next/dist/client/components/navigation";

export default async function Home() {
  const { user } = await getCurrentSession();
  if (user === null) {
    return redirect("/");
  }
  return (
    <>
      <Konec />
    </>
  );
}



