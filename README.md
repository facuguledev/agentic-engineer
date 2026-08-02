# Agentic Engineer

Multi-agent system for autonomous, auditable application delivery.

## Structure

```
agentic-engineer/
├── agents/                    # System prompts and config per agent
│   ├── agent-01-backend/      # Data isolation, multi-tenant RLS, API hardening
│   ├── agent-02-frontend/     # UI/UX, consumes AGENT_01's typed contract
│   ├── agent-03-devops/       # CI/CD, production migrations, GitHub Actions
│   └── agent-04-sre/          # Observability, Sentry, monitoring, incident response
├── contracts/                 # Shared cross-agent interface (OpenAPI, TS types)
│   └── api-specs/
├── apps/                      # Generated production code
│   ├── backend/               # Drizzle schemas, migrations, API routes
│   └── frontend/
├── infra/
│   └── neon/                  # Branching scripts, RLS config, test seeds
└── docs/
    ├── research/              # Technical research backing agent rules
    └── decisions/             # ADRs — why each architecture decision was made
```

## Invariants

1. Scope per agent: writes restricted to its own `agents/<n>/` and `apps/<n>/`.
2. `contracts/` is the sole cross-agent interface. No agent reads another's internal source.
3. `agent-03-devops` + human review is the only path to production.
4. Non-trivial architecture decisions require an ADR in `docs/decisions/`.

## Status

| Agent | Scope | Status |
|---|---|---|
| 01 — backend | Multi-tenant RLS, Drizzle, Neon branching, `PENTEST_ISOLATION` | system prompt ready |
| 02 — frontend | UI, consumes AGENT_01 contract | pending |
| 03 — devops | CI/CD, production apply | pending |
| 04 — sre | Observability, Sentry, incident response | pending |
