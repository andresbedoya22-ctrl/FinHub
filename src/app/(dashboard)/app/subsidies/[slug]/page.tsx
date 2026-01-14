import SubsidyDetailClient from "./ui/SubsidyDetailClient";

export default async function SubsidyDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <SubsidyDetailClient slug={slug} />;
}
