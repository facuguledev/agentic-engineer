import Link from "next/link";
import type { ProjectResponse } from "@contracts/api-specs/schema";

export function ProjectCard({ project }: { project: ProjectResponse }) {
  return (
    <Link
      href={`/projects/${project.id}`}
      className="group border border-black p-6 flex flex-col gap-2 col-span-12 sm:col-span-6 lg:col-span-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      <h2 className="text-h2 font-grotesk group-hover:text-accent transition-colors duration-300">
        {project.name}
      </h2>
      <span className="font-mono text-label text-[#565656]">
        Updated {new Date(project.updatedAt).toLocaleDateString()}
      </span>
    </Link>
  );
}
