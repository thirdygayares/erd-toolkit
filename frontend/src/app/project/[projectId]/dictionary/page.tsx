import { Dashboard } from "@/components/project/Dashboard";

interface ProjectDictionaryPageProps {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ share?: string }>;
}

export default async function ProjectDictionaryPage({
  params,
  searchParams,
}: ProjectDictionaryPageProps) {
  const { projectId } = await params;
  const { share } = await searchParams;

  return (
    <Dashboard
      projectId={projectId}
      initialShareSlug={share}
      initialView="dictionary"
    />
  );
}
