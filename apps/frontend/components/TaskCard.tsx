"use client";

import { TaskStatus, type TaskResponse, type UserResponse } from "@contracts/api-specs/schema";
import { Dropdown } from "./ui/Dropdown";

const STATUS_OPTIONS = TaskStatus.options;

export function TaskCard({
  task,
  assignee,
  onStatusChange,
}: {
  task: TaskResponse;
  assignee?: UserResponse;
  onStatusChange: (status: TaskResponse["status"]) => void;
}) {
  return (
    <article className="border border-black bg-white p-4 flex flex-col gap-3">
      <h3 className="text-body font-grotesk font-medium">{task.title}</h3>
      <div className="flex items-center justify-between">
        <span className="font-mono text-label text-[#565656]">
          {assignee ? assignee.name : "Unassigned"}
        </span>
        <Dropdown
          label={`Status for ${task.title}`}
          value={task.status}
          options={STATUS_OPTIONS}
          onChange={onStatusChange}
        />
      </div>
    </article>
  );
}
