// src/app/admin/page.tsx
import { auth } from "src/server/LOGIN_LUCIA_ACTION/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import AddUserForm from "src/app/admin/components/main";

export default async function AdminPage() {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session || session.user.role !== "admin") {
        redirect("/dashboard"); // ali kamorkoli, kjer ne-admini pristanejo
    }

    return (
        <div>
            <AddUserForm />
        </div>
    );
}