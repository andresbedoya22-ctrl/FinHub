import SubsidyWizardClient from "./ui/SubsidyWizardClient";

export default async function SubsidyWizardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <SubsidyWizardClient slug={slug} />;
}
