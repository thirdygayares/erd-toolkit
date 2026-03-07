import type { Metadata } from "next";

import { ProjectListPage } from "@/components/projects/ProjectListPage";

export const metadata: Metadata = {
  title: "Projects | ERD Toolkit",
  description: "Manage workspaces and ERD projects.",
};

export default function ProjectsPage() {
  return <ProjectListPage />;
}
