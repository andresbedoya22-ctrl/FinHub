import SubsidyCheckoutClient from "./ui/SubsidyCheckoutClient";

export default async function SubsidyCheckoutPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <SubsidyCheckoutClient slug={slug} />;
}
