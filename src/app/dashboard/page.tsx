import { getCurrentSession } from "~/server/session";
import { Dashboard } from "./components/Buttonic";
import { redirect } from "next/navigation";

export default async function Home() {

    const { user } = await getCurrentSession();
    if (user === null) {
        return redirect("/");
    }
    return (

        <><h1>login dela</h1>
            <br />
            <Dashboard /></>
    );
}
