import SubsidyCheckoutClient from "./ui/SubsidyCheckoutClient";

export default function SubsidyCheckoutPage({ params }: { params: { slug: string } }) {
  return <SubsidyCheckoutClient slug={params.slug} />;
}
