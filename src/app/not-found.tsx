import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Stran ni najdena",
  description: "Stran, ki jo iščete, ne obstaja.",
};

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-9xl font-bold text-gray-200">404</h1>
        <h2 className="mt-4 text-2xl font-semibold text-gray-800">
          Stran ni najdena
        </h2>
        <p className="mt-2 text-gray-600">
          Stran, ki jo iščete, ne obstaja.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Nazaj domov
        </Link>
      </div>
    </div>
  );
}
