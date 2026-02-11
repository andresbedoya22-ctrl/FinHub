import { AdminCaseDetailClient } from "@/features/cases/ui/AdminCaseDetailClient";

export default async function AdminCaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AdminCaseDetailClient caseId={id} />;
}
