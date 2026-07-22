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

**En développement (source locale) :**

```bash
pnpm run dev:docker   # postgres + redis + temporal
pnpm run --filter postiz-backend --filter postiz-orchestrator --filter takka-postiz --parallel dev
```

**Services Docker indispensables :**

- `postiz-postgres`
- `postiz-redis`
- `temporal` + `temporal-postgresql` + `temporal-elasticsearch`

**Process Node à lancer :**

- `apps/backend`
- `apps/orchestrator`
- `apps/takka-postiz` (ou `apps/frontend` si tu restes sur l’UI complète)

---

## Setup et démarrage Takka

Takka (`apps/takka-postiz`) est l’UI sociale réduite : auth, calendrier, canaux, média, analytics, settings (dont clé API Developers), notifications. Même `.env` racine que Postiz.

### Prérequis

- Node + pnpm (comme le monorepo)
- Docker pour l’infra (`pnpm run dev:docker`)
- Fichier `.env` à la racine (partir de `.env.example`)

### Config `.env` utile

```env
FRONTEND_URL="http://localhost:4200"
NEXT_PUBLIC_BACKEND_URL="http://localhost:3000"
BACKEND_INTERNAL_URL="http://localhost:3000"
```

`FRONTEND_URL` doit pointer vers Takka (CORS, OAuth LinkedIn, etc.). Ne lance **pas** `postiz-frontend` en même temps : les deux utilisent le port **4200**.

### Démarrer

```bash
# 1. Infra
pnpm run dev:docker

# 2. Backend + orchestrator + Takka
pnpm run dev:takka-stack

# ou séparément :
# pnpm run --filter postiz-backend --filter postiz-orchestrator --filter takka-postiz --parallel dev
```

UI : http://localhost:4200  
API : http://localhost:3000  
Public API : http://localhost:3000/public/v1 (voir [`PUBLIC_API.md`](./PUBLIC_API.md))

Redirect OAuth réseaux : basé sur `FRONTEND_URL` (ex. LinkedIn → `http://localhost:4200/integrations/social/linkedin`).

Plus de détail scope / commandes : [`apps/takka-postiz/README.md`](./apps/takka-postiz/README.md).

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
