import { Suspense } from "react";
import ResetPasswordPage from "~/app/resetpass/components/Resetpasswordpage";

export default function Home() {
    return (
        <Suspense fallback={<div>Nalagam...</div>}>
            <ResetPasswordPage />
        </Suspense>
    );
}