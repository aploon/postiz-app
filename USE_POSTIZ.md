# Plan de réduction Postiz – "Posts Only"

## À conserver (cœur "posts only")

- `libraries/nestjs-libraries` — Providers sociaux, Prisma, refresh, upload
- `apps/orchestrator` — Workflows d’envoi planifié (ex : `postWorkflowV105`)
- `apps/backend` — Version réduite, ou nouveau controller réutilisant les mêmes services
- **Services de base :** Postgres + Redis + Temporal

---

## À couper / ignorer

- `apps/frontend` (calendrier, IA, chat, facturation, etc.)
- `apps/extension` (hors providers nécessitant cookies, ex : Skool)
- `apps/commands` (hors tâches utiles type refresh tokens)
- Stripe, notifications, webhooks, analytics, agents, autopost, plugs…

---

## Alternative simple (phase 0)

Postiz expose déjà une **Public API** (`/public/v1`) permettant notamment :

- `POST /posts`, `GET /posts`, `DELETE /posts/:id`
- `GET /integrations`, upload média
- analytics, notifications (optionnel)

Tu peux commencer à brancher tes mini-apps dessus, puis extraire ta propre API slim dès que tu cibles exactement ton besoin.

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

| App / dossier     | Rôle                                         | Nécessaire ?                                  |
|-------------------|----------------------------------------------|-----------------------------------------------|
| `apps/backend`    | API NestJS                                   | Oui (ou **mini-api** qui l’étend)             |
| `apps/orchestrator` | Workers Temporal (post sending)             | Oui                                           |
| `apps/frontend`   | UI complète Postiz                           | Non                                           |
| `apps/extension`  | Extension navigateur (auth cookie)           | Non (hors providers spécifiques)              |
| `apps/commands`   | Tâches CLI (refresh tokens, etc.)            | Optionnel                                     |
| `apps/sdk`        | SDK client Postiz                            | Optionnel (utile pour tes mini-apps)          |

---

## Stack minimale recommandée

**En développement (source locale) :**
```bash
docker compose -f docker-compose.dev.yaml up -d # postgres + redis + temporal
pnpm run --filter ./apps/backend --filter ./apps/orchestrator dev
```

**Services Docker indispensables :**

- `postiz-postgres`
- `postiz-redis`
- `temporal` + `temporal-postgresql` + `temporal-elasticsearch`

**Process Node à lancer :**

- `apps/backend`
- `apps/orchestrator`

---

## Proposition concrète (en 3 phases)

**Phase 1 — Valider le besoin**

- Mini-app(s) qui appellent la Public API Postiz (`/public/v1/posts`, `/integrations`)
- Flux : connecter un réseau → créer un post → planification/envoi

**Phase 2 — Construire une API slim**

- Nouveau dossier `apps/mini-api` (ou module dédié dans `backend`) avec :
  - Auth org/user
  - CRUD posts
  - Connexion intégrations (OAuth)
  - Upload média
- Réutiliser les services existants, **sans réécrire les providers**

**Phase 3 — Nettoyage**

- Désactiver les modules inutiles (chat, IA, facturation, analytics…)
- Schéma Prisma : garder les tables nécessaires, surtout celles utilisées par les providers

---

> **En résumé :** Ne réécris pas la couche providers/OAuth. Construis une API + des mini-apps par-dessus, dans le monorepo Postiz, pour rester compatible avec les mises à jour.

---

**Besoin d’aller plus loin ?**
On peut détailler : endpoints de ta future API, modèle de données minimal, ou liste des fichiers/modules à retirer en priorité.