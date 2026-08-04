// Typed fetch hooks generated from contracts/api-specs/schema.ts.
//
// NOTE — assumption flagged, not a contract gap: schema.ts defines request/
// response *shapes* but not literal route paths. No field or endpoint
// shape is invented here; the paths below follow REST convention directly
// from the resource names already present in the contract (tenant, users,
// projects, tasks). If AGENT_01's actual routing differs, only the path
// strings in this file need to change — no shape changes required.
"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import { z } from "zod";
import {
  CreateProjectRequest,
  CreateTaskRequest,
  CreateUserRequest,
  ProjectResponse,
  TaskResponse,
  TenantResponse,
  UpdateProjectRequest,
  UpdateTaskRequest,
  UpdateUserRequest,
  UserResponse,
} from "@contracts/api-specs/schema";
import { apiFetch } from "./client";

// ---------------------------------------------------------------------------
// tenant — read-only from the API surface (contract §tenants).
// ---------------------------------------------------------------------------
export function useTenant(): UseQueryResult<TenantResponse> {
  return useQuery({
    queryKey: ["tenant"],
    queryFn: () => apiFetch("/api/tenant", TenantResponse),
  });
}

// ---------------------------------------------------------------------------
// users
// ---------------------------------------------------------------------------
export function useUsers(): UseQueryResult<UserResponse[]> {
  return useQuery({
    queryKey: ["users"],
    queryFn: () => apiFetch("/api/users", z.array(UserResponse)),
  });
}

export function useUser(userId: string): UseQueryResult<UserResponse> {
  return useQuery({
    queryKey: ["users", userId],
    queryFn: () => apiFetch(`/api/users/${userId}`, UserResponse),
    enabled: Boolean(userId),
  });
}

export function useCreateUser(): UseMutationResult<UserResponse, Error, z.infer<typeof CreateUserRequest>> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) => apiFetch("/api/users", UserResponse, { method: "POST", body }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });
}

export function useUpdateUser(
  userId: string
): UseMutationResult<UserResponse, Error, z.infer<typeof UpdateUserRequest>> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) => apiFetch(`/api/users/${userId}`, UserResponse, { method: "PATCH", body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["users", userId] });
    },
  });
}

// ---------------------------------------------------------------------------
// projects
// ---------------------------------------------------------------------------
export function useProjects(): UseQueryResult<ProjectResponse[]> {
  return useQuery({
    queryKey: ["projects"],
    queryFn: () => apiFetch("/api/projects", z.array(ProjectResponse)),
  });
}

export function useProject(projectId: string): UseQueryResult<ProjectResponse> {
  return useQuery({
    queryKey: ["projects", projectId],
    queryFn: () => apiFetch(`/api/projects/${projectId}`, ProjectResponse),
    enabled: Boolean(projectId),
  });
}

export function useCreateProject(): UseMutationResult<
  ProjectResponse,
  Error,
  z.infer<typeof CreateProjectRequest>
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) => apiFetch("/api/projects", ProjectResponse, { method: "POST", body }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projects"] }),
  });
}

export function useUpdateProject(
  projectId: string
): UseMutationResult<ProjectResponse, Error, z.infer<typeof UpdateProjectRequest>> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) =>
      apiFetch(`/api/projects/${projectId}`, ProjectResponse, { method: "PATCH", body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["projects", projectId] });
    },
  });
}

// ---------------------------------------------------------------------------
// tasks
// ---------------------------------------------------------------------------
export function useTasks(projectId: string): UseQueryResult<TaskResponse[]> {
  return useQuery({
    queryKey: ["projects", projectId, "tasks"],
    queryFn: () => apiFetch(`/api/projects/${projectId}/tasks`, z.array(TaskResponse)),
    enabled: Boolean(projectId),
  });
}

export function useCreateTask(
  projectId: string
): UseMutationResult<TaskResponse, Error, z.infer<typeof CreateTaskRequest>> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) => apiFetch("/api/tasks", TaskResponse, { method: "POST", body }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projects", projectId, "tasks"] }),
  });
}

// Single mutation instance per board (not per task-card) so it can be called
// from any card's callback without violating the Rules of Hooks — the task
// id travels in the mutation variables instead of being bound at hook-call
// time.
export function useUpdateTask(
  projectId: string
): UseMutationResult<TaskResponse, Error, { taskId: string } & z.infer<typeof UpdateTaskRequest>> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, ...body }) =>
      apiFetch(`/api/tasks/${taskId}`, TaskResponse, { method: "PATCH", body }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projects", projectId, "tasks"] }),
  });
}
