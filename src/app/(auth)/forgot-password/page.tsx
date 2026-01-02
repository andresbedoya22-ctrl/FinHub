import { Suspense } from "react";
import { ForgotPasswordClient } from "./ui/ForgotPasswordClient";

export const dynamic = "force-dynamic";

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="p-6" />}>
      <ForgotPasswordClient />
    </Suspense>
  );
}