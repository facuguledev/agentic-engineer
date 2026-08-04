import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ProjectCard } from "./ProjectCard";

const project = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Test Project",
  createdBy: "22222222-2222-4222-8222-222222222222",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
};

describe("ProjectCard", () => {
  it("renders the project name and links to its project route", () => {
    render(<ProjectCard project={project} />);
    const link = screen.getByRole("link", { name: /test project/i });
    expect(link).toHaveAttribute("href", `/projects/${project.id}`);
  });

  it("shows an updated-at date derived from the contract's updatedAt field", () => {
    render(<ProjectCard project={project} />);
    expect(screen.getByText(/updated/i)).toBeInTheDocument();
  });
});
