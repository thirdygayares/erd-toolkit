import { Dashboard } from "@/components/project/Dashboard";

interface ProjectPageProps {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ share?: string }>;
}

export default async function ProjectPage({
  params,
  searchParams,
}: ProjectPageProps) {
  const { projectId } = await params;
  const { share } = await searchParams;

  return (
    <Dashboard
      projectId={projectId}
      initialShareSlug={share}
      initialView="erd"
    />
  );
}
