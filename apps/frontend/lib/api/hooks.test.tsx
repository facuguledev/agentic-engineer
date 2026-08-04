import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReactNode } from "react";
import { useProjects, useTasks, useUpdateTask } from "./hooks";

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

function mockFetchOnce(response: { ok: boolean; status: number; body: unknown }) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: response.ok,
    status: response.status,
    json: async () => response.body,
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const project = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Test Project",
  createdBy: "22222222-2222-4222-8222-222222222222",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const task = {
  id: "33333333-3333-4333-8333-333333333333",
  projectId: "11111111-1111-4111-8111-111111111111",
  assigneeId: null,
  title: "Task A",
  status: "todo" as const,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe("useProjects", () => {
  it("fetches /api/projects and parses the response against ProjectResponse[]", async () => {
    mockFetchOnce({ ok: true, status: 200, body: [project] });

    const { result } = renderHook(() => useProjects(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([project]);
  });

  it("surfaces the contract's ErrorResponse.error message as ApiError.message", async () => {
    mockFetchOnce({
      ok: false,
      status: 500,
      body: { error: "internal failure", requestId: "req-1" },
    });

    const { result } = renderHook(() => useProjects(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error?.message).toBe("internal failure");
  });
});

describe("useTasks", () => {
  it("fetches /api/projects/:projectId/tasks scoped to the given project", async () => {
    const fetchMock = mockFetchOnce({ ok: true, status: 200, body: [task] });

    const { result } = renderHook(() => useTasks(project.id), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/projects/${project.id}/tasks`,
      expect.objectContaining({ method: "GET" })
    );
    expect(result.current.data).toEqual([task]);
  });

  it("does not fire when projectId is empty (enabled: false)", () => {
    const fetchMock = mockFetchOnce({ ok: true, status: 200, body: [] });
    renderHook(() => useTasks(""), { wrapper: makeWrapper() });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("useUpdateTask", () => {
  it("PATCHes /api/tasks/:taskId, keeping the task id out of the request body", async () => {
    const fetchMock = mockFetchOnce({ ok: true, status: 200, body: { ...task, status: "doing" } });

    const { result } = renderHook(() => useUpdateTask(project.id), { wrapper: makeWrapper() });
    result.current.mutate({ taskId: task.id, status: "doing" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/tasks/${task.id}`,
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ status: "doing" }),
      })
    );
  });
});
