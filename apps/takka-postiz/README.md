# Takka Postiz

Social-only scheduling UI based on the Postiz frontend structure.

## Scope

- Auth (email/password)
- Calendar / launches (create, schedule, post now)
- Social channel connect (e.g. LinkedIn)
- Media library
- Basic settings (global + teams)
- Notifications

No agents, AI chat, analytics, plugs, third-party marketplace, billing UI, or developer OAuth apps.

## Dev

Uses the same root `.env` as Postiz (`FRONTEND_URL=http://localhost:4200`, backend URLs, etc.).

Takka listens on **port 4200**, same as `postiz-frontend`. **Do not run both at the same time.**

```bash
# infra
pnpm run dev:docker

# API + workers + Takka UI
pnpm run --filter postiz-backend --filter postiz-orchestrator --filter takka-postiz --parallel dev
# or:
pnpm run dev:takka-stack
```

Open: http://localhost:4200

OAuth redirect URIs stay on `FRONTEND_URL` (e.g. LinkedIn: `http://localhost:4200/integrations/social/linkedin`).
