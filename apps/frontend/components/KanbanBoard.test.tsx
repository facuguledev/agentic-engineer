import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { KanbanBoard } from "./KanbanBoard";

const users = [
  {
    id: "user-1",
    email: "ada@example.com",
    name: "Ada Lovelace",
    role: "member" as const,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];

const tasks = [
  {
    id: "t1",
    projectId: "p1",
    assigneeId: "user-1",
    title: "Task A",
    status: "todo" as const,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "t2",
    projectId: "p1",
    assigneeId: null,
    title: "Task B",
    status: "doing" as const,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];

describe("KanbanBoard", () => {
  it("groups tasks into their TaskStatus column", () => {
    render(<KanbanBoard tasks={tasks} users={users} onStatusChange={() => {}} />);
    expect(screen.getByRole("region", { name: /todo tasks/i })).toHaveTextContent("Task A");
    expect(screen.getByRole("region", { name: /doing tasks/i })).toHaveTextContent("Task B");
  });

  it("shows an explicit empty state for a column with no tasks", () => {
    render(<KanbanBoard tasks={tasks} users={users} onStatusChange={() => {}} />);
    expect(screen.getByRole("region", { name: /done tasks/i })).toHaveTextContent("No tasks");
  });

  it("propagates a status change with the originating task's id", async () => {
    const onStatusChange = vi.fn();
    const user = userEvent.setup();
    render(<KanbanBoard tasks={tasks} users={users} onStatusChange={onStatusChange} />);

    await user.click(screen.getByRole("button", { name: /status for task a/i }));
    await user.click(await screen.findByRole("menuitem", { name: "done" }));

    expect(onStatusChange).toHaveBeenCalledWith("t1", "done");
  });
});
