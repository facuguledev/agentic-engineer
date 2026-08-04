import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { TaskCard } from "./TaskCard";

const task = {
  id: "task-1",
  projectId: "project-1",
  assigneeId: "user-1",
  title: "Write tests",
  status: "todo" as const,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const assignee = {
  id: "user-1",
  email: "ada@example.com",
  name: "Ada Lovelace",
  role: "member" as const,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("TaskCard", () => {
  it("renders the task title and assignee name", () => {
    render(<TaskCard task={task} assignee={assignee} onStatusChange={() => {}} />);
    expect(screen.getByText("Write tests")).toBeInTheDocument();
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
  });

  it("shows Unassigned when no assignee is provided", () => {
    render(<TaskCard task={task} onStatusChange={() => {}} />);
    expect(screen.getByText("Unassigned")).toBeInTheDocument();
  });

  it("calls onStatusChange with the newly selected status when a dropdown item is chosen", async () => {
    const onStatusChange = vi.fn();
    const user = userEvent.setup();
    render(<TaskCard task={task} assignee={assignee} onStatusChange={onStatusChange} />);

    await user.click(screen.getByRole("button", { name: /status for write tests/i }));
    await user.click(await screen.findByRole("menuitem", { name: "doing" }));

    expect(onStatusChange).toHaveBeenCalledTimes(1);
    expect(onStatusChange).toHaveBeenCalledWith("doing");
  });
});
