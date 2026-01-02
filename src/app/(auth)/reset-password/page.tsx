import { Suspense } from "react";
import { ResetPasswordClient } from "./ui/ResetPasswordClient";

export const dynamic = "force-dynamic";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="p-6" />}>
      <ResetPasswordClient />
    </Suspense>
  );
}