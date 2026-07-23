# Plan de réduction Postiz – "Posts Only"

## À conserver (cœur "posts only")

- `libraries/nestjs-libraries` — Providers sociaux, Prisma, refresh, upload
- `apps/orchestrator` — Workflows d’envoi planifié (ex. `postWorkflowV105`)
- `apps/backend` — API NestJS (UI + Public API `/public/v1`)
- `apps/takka-postiz` — UI sociale réduite (calendrier, canaux, média, analytics, settings, clé API)
- **Services de base :** Postgres + Redis + Temporal

---

## À couper / ignorer

- `apps/frontend` — UI Postiz complète (agents, IA, plugs, marketplace, billing UI, OAuth Apps…) ; remplacée en pratique par Takka
- `apps/extension` (hors providers nécessitant cookies, ex. Skool)
- `apps/commands` (hors tâches utiles type refresh tokens)
- Sur Takka : agents, chat IA, plugs, marketplace, facturation UI, apps OAuth tierces

---

## Alternative simple (phase 0)

Postiz expose déjà une **Public API** (`/public/v1`) pour brancher des mini-apps (posts, intégrations, upload…). Détail : [`PUBLIC_API.md`](./PUBLIC_API.md).

Les appels se font depuis ton backend (pas depuis le navigateur d’une app tierce). Tu peux aussi utiliser Takka comme UI, puis extraire une API slim si besoin.

---

## Point licence

Postiz est en **AGPL-3.0**. Si tu distribues le service (SaaS ou self-hosted), vérifie bien tes obligations de licence.

---

## Récapitulatif des services (docker-compose.yaml)

### Services Postiz principaux

| Service         | Rôle                                      | Nécessaire ?                                                |
|-----------------|-------------------------------------------|-------------------------------------------------------------|
| `postiz`          | Image tout-en-un (backend + frontend + orchestrator) | Non si tu développes en local depuis la source              |
| `postiz-postgres` | DB principale (users, orgs, intégrations, posts, tokens) | Oui — **obligatoire**                                       |
| `postiz-redis`    | Cache, rate limit, analytics temporaires         | Oui — **obligatoire**                                       |
| `spotlight`       | Debug Sentry local                              | Non                                                         |

### Stack Temporal (envoi planifié)

| Service                | Rôle                                     | Nécessaire ?                           |
|------------------------|------------------------------------------|----------------------------------------|
| `temporal`             | Moteur de workflows (planning posts)     | Oui si tu gardes l’architecture Postiz |
| `temporal-postgresql`  | DB interne de Temporal                   | Oui (dépendance de Temporal)           |
| `temporal-elasticsearch` | Visibilité / recherche des workflows     | Oui (config actuelle de Postiz)        |
| `temporal-ui`          | Interface web debug Temporal             | Optionnel (utile en dev)               |
| `temporal-admin-tools` | CLI tctl admin Temporal                  | Optionnel (dev/debug)                  |

---

### Apps du monorepo (hors docker-compose)

| App / dossier       | Rôle                                         | Nécessaire ?                                  |
|---------------------|----------------------------------------------|-----------------------------------------------|
| `apps/backend`      | API NestJS                                   | Oui                                           |
| `apps/orchestrator` | Workers Temporal (post sending)              | Oui                                           |
| `apps/takka-postiz` | UI posts-only (port 4200)                    | Oui pour l’UI Takka                           |
| `apps/frontend`     | UI complète Postiz                           | Non (même port 4200 que Takka — ne pas lancer les deux) |
| `apps/extension`    | Extension navigateur (auth cookie)           | Non (hors providers spécifiques)              |
| `apps/commands`     | Tâches CLI (refresh tokens, etc.)            | Optionnel                                     |
| `apps/sdk`          | SDK client Postiz                            | Optionnel (utile pour tes mini-apps)          |

---

## Stack minimale recommandée

**Infra Docker Takka**

| Fichier | Usage | Commande |
|---------|--------|----------|
| `docker-compose.takka.dev.yaml` | Dev local | `pnpm run docker:takka:dev` |
| `docker-compose.takka.yaml` | Prod (serveur) | `pnpm run docker:takka` |

Services : `postiz-postgres`, `postiz-redis`, `temporal` (+ postgres/ES Temporal).  
Pas d’image `postiz-app`, pas de pgAdmin / RedisInsight / Temporal UI / Spotlight.

**Apps Node (hors Docker)**

- Dev : `pnpm run dev:takka-stack`
- Prod : build puis `pnpm --filter … run pm2` (ou systemd) — pas `start:prod:*` seuls en SSH

---

## Setup et démarrage Takka

Takka (`apps/takka-postiz`) : auth, calendrier, canaux, média, analytics, settings (clé API), notifications.

### Prérequis

- Node + pnpm, Docker
- `.env` à la racine (partir de `.env.example`)

### Config `.env`

**Dev :**

```env
FRONTEND_URL="http://localhost:4200"
NEXT_PUBLIC_BACKEND_URL="http://localhost:3000"
BACKEND_INTERNAL_URL="http://localhost:3000"
```

**Prod :**

```env
FRONTEND_URL="https://postiz.takkatech.com"
NEXT_PUBLIC_BACKEND_URL="https://postiz-backend.takkatech.com"
BACKEND_INTERNAL_URL="http://127.0.0.1:3000"
DATABASE_URL="postgresql://postiz-user:postiz-password@127.0.0.1:5433/postiz-db-local"
REDIS_URL="redis://127.0.0.1:6380"
TEMPORAL_ADDRESS="127.0.0.1:7233"
```

Sur Plesk, `5432` / `6379` sont souvent déjà pris : le compose mappe donc **5433** (Postgres) et **6380** (Redis).
Ne lance pas `postiz-frontend` en même temps que Takka (port 4200).

### Démarrer — dev

```bash
pnpm run docker:takka:dev
pnpm run prisma-db-push
pnpm run dev:takka-stack
```

### Démarrer — prod

```bash
pnpm run docker:takka
pnpm run prisma-db-push
pnpm --filter postiz-backend --filter postiz-orchestrator --filter takka-postiz run build
# Start apps directly
pnpm run start:prod:backend
pnpm run start:prod:orchestrator
pnpm run start:prod:takka
# Start apps with PM2
pnpm --filter postiz-backend run pm2
pnpm --filter postiz-orchestrator run pm2
pnpm --filter takka-postiz run pm2
# Save and setup PM2 to start at boot
pm2 save
pm2 startup
```

Chaque script `pm2` du package fait : `pm2 start pnpm --name <app> -- start`  
→ PM2 lance le script `start` du package (`next start` pour Takka, `node …/main.js` pour backend/orchestrator), avec le `.env` racine via `dotenv`. Restart auto si crash ; `pm2 save` + `pm2 startup` relancent au reboot serveur.

Commandes utiles : `pm2 status` · `pm2 logs` · `pm2 restart all`

---

## Proposition concrète (en 3 phases)

**Phase 1 — Valider le besoin**

- UI Takka et/ou mini-app(s) via Public API (`/public/v1/posts`, `/integrations`)
- Flux : connecter un réseau → créer un post → planification/envoi

**Phase 2 — Construire une API slim** (si besoin)

- Nouveau dossier `apps/mini-api` (ou module dédié dans `backend`) avec auth org/user, CRUD posts, OAuth intégrations, upload
- Réutiliser les services existants, **sans réécrire les providers**

**Phase 3 — Nettoyage**

- Garder Takka ; laisser de côté `apps/frontend` et modules hors scope
- Schéma Prisma : tables nécessaires aux providers / posts

---

> **En résumé :** Ne réécris pas la couche providers/OAuth. Utilise Takka + Public API par-dessus le monorepo Postiz pour rester compatible avec les mises à jour.

---

**Besoin d’aller plus loin ?**
On peut détailler : endpoints d’une future API slim, modèle de données minimal, ou liste des fichiers/modules à retirer en priorité.
