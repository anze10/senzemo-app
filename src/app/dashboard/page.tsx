//import { getCurrentSession } from "~/server/session";
import Buttonic from "./components/Buttonic";


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
