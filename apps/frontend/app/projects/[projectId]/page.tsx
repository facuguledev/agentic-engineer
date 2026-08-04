"use client";

import { use } from "react";
import { useProject, useTasks, useUpdateTask, useUsers } from "@/lib/api/hooks";
import { KanbanBoard } from "@/components/KanbanBoard";
import { SplitText } from "@/components/ui/SplitText";

export default function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);
  const { data: project, isLoading: projectLoading } = useProject(projectId);
  const { data: tasks, isLoading: tasksLoading, isError } = useTasks(projectId);
  const { data: users } = useUsers();
  const updateTask = useUpdateTask(projectId);

  return (
    <div className="flex flex-col gap-10">
      <SplitText as="h1" className="text-display font-grotesk">
        {project?.name ?? (projectLoading ? "…" : "Project")}
      </SplitText>

      {tasksLoading && <p className="font-mono text-label">Loading tasks…</p>}
      {isError && <p className="font-mono text-label">Failed to load tasks.</p>}

      {tasks && (
        <KanbanBoard
          tasks={tasks}
          users={users ?? []}
          onStatusChange={(taskId, status) => updateTask.mutate({ taskId, status })}
        />
      )}
    </div>
  );
}
