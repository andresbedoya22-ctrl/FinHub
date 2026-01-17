import SubsidyApplicationDetailClient from "./ui/SubsidyApplicationDetailClient";

export default function SubsidyApplicationDetailPage({ params }: { params: { id: string } }) {
  return <SubsidyApplicationDetailClient id={params.id} />;
}
