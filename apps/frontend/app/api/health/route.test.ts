import { describe, it, expect } from "vitest";
import { GET } from "./route";

describe("GET /api/health", () => {
  it("returns 200 with a status: ok body", async () => {
    const response = await GET();
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.status).toBe("ok");
    expect(body.service).toBe("agentic-engineer-frontend");
    expect(typeof body.timestamp).toBe("string");
    // Must be a real, parseable ISO timestamp, not just any string.
    expect(Number.isNaN(Date.parse(body.timestamp))).toBe(false);
  });
});
