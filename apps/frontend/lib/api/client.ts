// AGENT_02 data layer — INGEST_CONTRACT output.
//
// DATA CONTRACT rule 1: contracts/api-specs/ is the only source of truth for
// endpoints, fields, and response shapes. This file imports the contract
// directly (no re-declared/duplicated shapes) and adds nothing beyond a
// thin fetch wrapper + runtime validation.
//
// DATA CONTRACT rule 3: no auth/session/token logic lives here. This client
// assumes it is running behind an already-authenticated fetch — either
// same-origin cookie auth (default: credentials: "include") or a header
// injected by the consuming shell via configureApiClient(). Token
// acquisition/refresh is explicitly out of this agent's scope.
import { ErrorResponse } from "@contracts/api-specs/schema";
import type { z } from "zod";

let getAuthHeader: (() => Record<string, string> | undefined) | null = null;

/**
 * Consuming shell (outside AGENT_02 scope) may register a header provider
 * for token-based auth schemes. AGENT_02 never acquires or refreshes the
 * token itself — it only reads whatever header the host app supplies.
 */
export function configureApiClient(opts: {
  getAuthHeader?: () => Record<string, string> | undefined;
}) {
  getAuthHeader = opts.getAuthHeader ?? null;
}

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

export class ApiError extends Error {
  status: number;
  requestId?: string;

  constructor(status: number, body: ErrorResponse) {
    super(body.error);
    this.name = "ApiError";
    this.status = status;
    this.requestId = body.requestId;
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
};

/**
 * Fetch + parse against a contract schema. No endpoint or field outside
 * contracts/api-specs/ may be introduced via this function (HARD
 * CONSTRAINTS).
 */
export async function apiFetch<S extends z.ZodTypeAny>(
  path: string,
  schema: S,
  options: RequestOptions = {}
): Promise<z.infer<S>> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: options.method ?? "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(getAuthHeader?.() ?? {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const json = await res.json().catch(() => undefined);

  if (!res.ok) {
    const parsedError = ErrorResponse.safeParse(json);
    if (parsedError.success) {
      throw new ApiError(res.status, parsedError.data);
    }
    throw new ApiError(res.status, { error: `Request failed with status ${res.status}` });
  }

  return schema.parse(json);
}
