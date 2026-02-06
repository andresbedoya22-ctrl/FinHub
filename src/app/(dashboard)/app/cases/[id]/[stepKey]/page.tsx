import { Screen } from "@/ui/components/Screen";
import { StepClient } from "@/features/cases/ui/StepClient";

export default async function CaseStepPage({
  params,
}: {
  params: Promise<{ id: string; stepKey: string }>;
}) {
  const { id, stepKey } = await params;

  return (
    <Screen className="space-y-6">
      <StepClient caseId={id} stepKey={stepKey} />
    </Screen>
  );
}
