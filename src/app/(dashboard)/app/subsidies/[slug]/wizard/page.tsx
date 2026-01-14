import SubsidyWizardClient from "./ui/SubsidyWizardClient";

export default function SubsidyWizardPage({ params }: { params: { slug: string } }) {
  return <SubsidyWizardClient slug={params.slug} />;
}
