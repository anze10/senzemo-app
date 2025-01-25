//import { getCurrentSession } from "~/server/session";
import Dashboar from "./components/Dashboard";
// import { redirect } from "next/navigation";

export default async function Home() {

    // const { user } = await getCurrentSession();
    // if (user === null) {
    //     return redirect("/");
    // }
    return (

        <><h1>login dela</h1>
            <br />
            <Dashboar /></>
    );
}
