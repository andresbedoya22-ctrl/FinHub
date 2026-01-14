import SubsidyResultClient from "./ui/SubsidyResultClient";

export default function SubsidyResultPage({ params }: { params: { slug: string } }) {
  return <SubsidyResultClient slug={params.slug} />;
}
