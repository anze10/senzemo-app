"use client";

import dynamic from "next/dynamic";

// import Signin from 'src/app/components/Singin';
const Signin = dynamic(() => import("src/app/components/Singin"), {
  ssr: false,
});

export default function TestSignIn() {
  return <Signin />;
}
