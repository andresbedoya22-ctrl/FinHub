import { notFound } from "next/navigation";

import { InsuranceTypeFlowClient } from "@/features/leadgen/ui/InsuranceTypeFlowClient";
import { isInsuranceType } from "@/features/leadgen/ui/insuranceCatalogData";

export default async function InsuranceTypePage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;
  if (!isInsuranceType(type)) {
    notFound();
  }

  return <InsuranceTypeFlowClient type={type} />;
}
