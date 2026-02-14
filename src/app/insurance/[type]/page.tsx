import { redirect } from "next/navigation";

export default async function InsuranceTypeShortcutPage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;
  redirect(`/app/insurance/${type}`);
}
