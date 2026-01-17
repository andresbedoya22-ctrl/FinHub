import SubsidyResultClient from "./ui/SubsidyResultClient";

export default async function SubsidyResultPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <SubsidyResultClient slug={slug} />;
}
