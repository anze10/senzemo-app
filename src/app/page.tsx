import TestSignIn from "./components/test";

export default function Home() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gray-900">
      <div className="text-opacity-30 absolute top-0 right-0 left-0 pt-8 text-center text-8xl font-bold text-white">
        SENZEMO
      </div>
      <div className="z-10 w-96 rounded-xl bg-gray-800 p-8 shadow-2xl">
        <TestSignIn />
      </div>
    </div>
  );
}
