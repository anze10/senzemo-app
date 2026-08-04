import Image from "next/image";
import TestSignIn from "./components/test";

export default function Home() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gray-900">
      <div className="z-10 flex w-96 flex-col items-center rounded-xl bg-gray-800 p-8 shadow-2xl">
        <Image
          src="/senzemo-logo.svg"
          alt="Senzemo"
          width={180}
          height={48}
          className="mb-6"
          priority
        />
        <TestSignIn />
      </div>
    </div>
  );
}