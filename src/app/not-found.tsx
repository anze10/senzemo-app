import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Page Not Found",
    description: "The page you're looking for doesn't exist.",
};

export default function NotFound() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
            <div className="text-center">
                <h1 className="text-9xl font-bold text-gray-200">404</h1>
                <h2 className="mt-4 text-2xl font-semibold text-gray-800">
                    Page Not Found
                </h2>
                <p className="mt-2 text-gray-600">
                    The page you're looking for doesn't exist.
                </p>
                <a
                    href="/"
                    className="mt-6 inline-block rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                >
                    Go Home
                </a>
            </div>
        </div>
    );
}
