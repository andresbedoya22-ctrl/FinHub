import SubsidyDetailClient from "./ui/SubsidyDetailClient";

export default function SubsidyDetailPage({ params }: { params: { slug: string } }) {
  return <SubsidyDetailClient slug={params.slug} />;
}
