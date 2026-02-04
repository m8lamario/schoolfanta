import { Suspense } from "react";
import StartClient from "./StartClient";

export default function StartPage() {
  return (
    <Suspense fallback={null}>
      <StartClient />
    </Suspense>
  );
}
