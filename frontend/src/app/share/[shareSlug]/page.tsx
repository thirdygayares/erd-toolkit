import { ShareRedirect } from "@/components/project/ShareRedirect";

interface SharePageProps {
  params: Promise<{ shareSlug: string }>;
}

export default async function SharePage({ params }: SharePageProps) {
  const { shareSlug } = await params;
  return <ShareRedirect shareSlug={shareSlug} />;
}
