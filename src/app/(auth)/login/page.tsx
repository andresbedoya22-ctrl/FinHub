import { Suspense } from "react";
import { LoginClient } from "./ui/LoginClient";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-6" />}>
      <LoginClient />
    </Suspense>
  );
}