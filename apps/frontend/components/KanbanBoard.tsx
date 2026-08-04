"use client";

import { TaskStatus, type TaskResponse, type UserResponse } from "@contracts/api-specs/schema";
import { TaskCard } from "./TaskCard";

const COLUMNS = TaskStatus.options;

export function KanbanBoard({
  tasks,
  users,
  onStatusChange,
}: {
  tasks: TaskResponse[];
  users: UserResponse[];
  onStatusChange: (taskId: string, status: TaskResponse["status"]) => void;
}) {
  const usersById = new Map(users.map((u) => [u.id, u]));

  return (
    <div className="grid grid-cols-12 gap-4">
      {COLUMNS.map((status) => {
        const columnTasks = tasks.filter((t) => t.status === status);
        return (
          <section
            key={status}
            aria-label={`${status} tasks`}
            className="col-span-12 md:col-span-4 border border-black flex flex-col"
          >
            <h2 className="font-mono text-label uppercase tracking-[0.08em] border-b border-black p-4">
              {status} <span className="text-[#565656]">({columnTasks.length})</span>
            </h2>
            <div className="flex flex-col gap-3 p-4">
              {columnTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  assignee={task.assigneeId ? usersById.get(task.assigneeId) : undefined}
                  onStatusChange={(next) => onStatusChange(task.id, next)}
                />
              ))}
              {columnTasks.length === 0 && (
                <p className="font-mono text-label text-[#565656]">No tasks</p>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
