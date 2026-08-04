"use client";

import { useState } from "react";
import { useCreateProject, useProjects } from "@/lib/api/hooks";
import { ProjectCard } from "@/components/ProjectCard";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { SplitText } from "@/components/ui/SplitText";

export default function ProjectsPage() {
  const { data: projects, isLoading, isError } = useProjects();
  const createProject = useCreateProject();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  return (
    <div className="flex flex-col gap-10">
      <div className="flex items-end justify-between gap-6">
        <SplitText as="h1" className="text-display font-grotesk">
          Projects
        </SplitText>
        <Dialog
          title="New project"
          open={open}
          onOpenChange={setOpen}
          trigger={<Button variant="primary">New project</Button>}
        >
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              createProject.mutate(
                { name },
                {
                  onSuccess: () => {
                    setName("");
                    setOpen(false);
                  },
                }
              );
            }}
          >
            <label className="flex flex-col gap-2 font-mono text-label uppercase tracking-[0.08em]">
              Name
              <input
                className="border border-black px-4 py-3 text-body font-grotesk focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={1}
              />
            </label>
            <Button type="submit" variant="primary" disabled={createProject.isPending}>
              {createProject.isPending ? "Creating…" : "Create"}
            </Button>
          </form>
        </Dialog>
      </div>

      {isLoading && <p className="font-mono text-label">Loading…</p>}
      {isError && <p className="font-mono text-label">Failed to load projects.</p>}

      <div className="grid grid-cols-12 gap-4">
        {projects?.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>
    </div>
  );
}
