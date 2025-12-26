import { Suspense } from "react";
import { RegisterClient } from "./ui/RegisterClient";

export const dynamic = "force-dynamic";

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="p-6" />}>
      <RegisterClient />
    </Suspense>
  );
}