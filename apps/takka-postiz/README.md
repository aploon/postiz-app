# Takka Postiz

Social-only scheduling UI based on the Postiz frontend structure.

## Scope

- Auth (email/password)
- Calendar / launches (create, schedule, post now)
- Analytics (social channels)
- Social channel connect (e.g. LinkedIn)
- Media library
- Basic settings (global + teams + Developers API key)
- Notifications

No agents, AI chat, plugs, third-party marketplace, billing UI, or OAuth Apps for third parties.

## Dev / Prod

Même `.env` racine que Postiz. Port UI **4200** (ne pas lancer `postiz-frontend` en parallèle).

```bash
# Infra
pnpm run docker:takka:dev   # local  → docker-compose.takka.dev.yaml
pnpm run docker:takka       # prod   → docker-compose.takka.yaml

# Apps
pnpm run dev:takka-stack                                      # local
# prod : build + start:prod:takka-backend | orchestrator | takka
```

Détail prod / `.env` : [`USE_POSTIZ.md`](../../USE_POSTIZ.md).

OAuth redirects : basés sur `FRONTEND_URL`.
