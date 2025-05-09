//import { getCurrentSession } from "~/server/LOGIN_LUCIA_ACTION/session";
import Buttonic from "./components/Buttonic";
//import { redirect } from "next/navigation";


export default async function Home() {

    // const { user } = await getCurrentSession();
    // if (user === null) {
    //     return redirect("/");
    // }
    return (

        <>
            <Buttonic />
        </>
    );
}
