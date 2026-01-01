import * as React from "react";
import { Card } from "@/ui/components/Card";

export function LandingCard({ className = "", ...props }: React.ComponentProps<typeof Card>) {
  return (
    <Card
      {...props}
      className={[
        "border-white/10 !bg-white/5 !text-white shadow-[0_12px_40px_-18px_rgba(0,0,0,0.65)] backdrop-blur-sm",
        className
      ].join(" ")}
    />
  );
}
