import type { ReactNode } from "react";
import { cookies } from "next/headers";

import DashboardShell from "./ui/DashboardShell";

export default async function Layout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const themeCookie = cookieStore.get("theme")?.value;
  const initialTheme = themeCookie === "light" ? "light" : "dark";

  return <DashboardShell initialTheme={initialTheme}>{children}</DashboardShell>;
}
