# Postiz Public API — Guide pour applications externes

Ce document décrit comment une **application tierce** peut utiliser l’API publique Postiz (`/public/v1`) pour automatiser l’ensemble du cycle de vie des publications : authentification, connexion des réseaux, médias, planification, publication, suivi et analytics.

Comme dans la doc Postiz, les appels se font **depuis ton backend** (ou un worker / n8n / SDK) avec la clé API

Base URL (self-hosted local) :

```text
http://localhost:3000/public/v1
```

Production Postiz cloud (référence) :

```text
https://api.postiz.com/public/v1
```

Tous les endpoints ci-dessous sont préfixés par cette base.

---

## Table des matières

1. [Authentification](#1-authentification)
2. [Vérifier la connexion](#2-vérifier-la-connexion)
3. [Canaux / intégrations](#3-canaux--intégrations)
4. [Connecter un réseau social (OAuth canal)](#4-connecter-un-réseau-social-oauth-canal)
5. [Paramètres & outils d’un canal](#5-paramètres--outils-dun-canal)
6. [Upload de médias](#6-upload-de-médias)
7. [Trouver un créneau libre](#7-trouver-un-créneau-libre)
8. [Créer / planifier / publier un post](#8-créer--planifier--publier-un-post)
9. [Lister, modifier, supprimer des posts](#9-lister-modifier-supprimer-des-posts)
10. [Notifications](#10-notifications)
11. [Analytics](#11-analytics)
12. [Groupes clients](#12-groupes-clients)
13. [Vidéo (génération / fonctions)](#13-vidéo-génération--fonctions)
14. [SDK officiel](#14-sdk-officiel)
15. [Limites, erreurs, prérequis](#15-limites-erreurs-prérequis)
16. [Parcours type bout-en-bout](#16-parcours-type-bout-en-bout)

---

## 1. Authentification

L’API publique **ne utilise pas** le JWT cookie de l’UI. Elle attend un header :

```http
Authorization: <token>
```

Sans préfixe `Bearer` obligatoire : envoyer la clé **telle quelle**.

### 1.1 API Key

1. Se connecter à Takka / Postiz (UI).
2. Settings → **Developers** → onglet Access → révéler / copier la clé.
3. Rotation possible via UI (`POST /user/api-key/rotate` — endpoint UI authentifié, pas public).

Exemple :

```bash
curl -s http://localhost:3000/public/v1/is-connected \
  -H "Authorization: VOTRE_API_KEY"
```

> Si Stripe est activé sur l’instance et que l’org n’a pas d’abonnement, l’API renvoie `401` (« No subscription found »).

---

## 2. Vérifier la connexion

```http
GET /public/v1/is-connected
Authorization: <token>
```

Réponse :

```json
{ "connected": true }
```

Utile comme health-check auth avant d’enchaîner les appels.

---

## 3. Canaux / intégrations

### 3.1 Lister les canaux connectés

```http
GET /public/v1/integrations
GET /public/v1/integrations?group=<customer_id>
Authorization: <token>
```

Réponse (tableau) :

```json
[
  {
    "id": "clx...",
    "name": "Mon LinkedIn",
    "identifier": "linkedin",
    "picture": "https://...",
    "disabled": false,
    "profile": "...",
    "customer": { "id": "...", "name": "Client A" }
  }
]
```

L’`id` est celui à utiliser dans `posts[].integration.id` à la création d’un post.

### 3.2 Déconnecter / supprimer un canal

```http
DELETE /public/v1/integrations/:id
Authorization: <token>
```

Supprime aussi les posts encore liés au canal (best-effort).

---

## 4. Connecter un réseau social (OAuth canal)

Pour démarrer l’OAuth **d’un provider** (LinkedIn, X, etc.) depuis une app externe :

```http
GET /public/v1/social/:integration
GET /public/v1/social/:integration?refresh=<integration_id_existant>
Authorization: <token>
```

`:integration` = identifiant provider (`linkedin`, `x`, `facebook`, …) — doit faire partie des providers autorisés sur l’instance.

Réponse :

```json
{ "url": "https://www.linkedin.com/oauth/v2/authorization?..." }
```

**Flux :**

1. Ton app appelle `GET /social/linkedin` avec la clé API.
2. Tu ouvres / rediriges l’utilisateur vers `url`.
3. L’utilisateur autorise chez le réseau.
4. Le callback revient sur **`FRONTEND_URL`** Postiz (`/integrations/social/<provider>`), qui finalise la connexion côté Postiz.
5. Ensuite `GET /integrations` liste le nouveau canal.

Providers nécessitant une URL externe custom (certains self-hosted) peuvent répondre `400` via l’API publique.

---

## 5. Paramètres & outils d’un canal

### 5.1 Schéma de settings + règles

```http
GET /public/v1/integration-settings/:id
Authorization: <token>
```

Retourne notamment :

- `maxLength` — limite de caractères
- `rules` — règles provider
- `settings` — schéma de validation des settings du post
- `tools` — méthodes disponibles pour `integration-trigger`

### 5.2 Déclencher un outil provider

```http
POST /public/v1/integration-trigger/:id
Authorization: <token>
Content-Type: application/json

{
  "methodName": "<nom_outil>",
  "data": { "key": "value" }
}
```

Gère le refresh de token côté serveur si nécessaire.

---

## 6. Upload de médias

Les posts référencent des médias via `{ "id", "path" }` (souvent issus de ces routes).

### 6.1 Upload fichier (multipart)

```http
POST /public/v1/upload
Authorization: <token>
Content-Type: multipart/form-data

file: <binary>
```

MIME acceptés (contrôle côté API) : jpeg, png, gif, webp, avif, bmp, tiff, **mp4**.

Réponse : objet média sauvegardé (`id`, `path`, …).

### 6.2 Upload depuis une URL

```http
POST /public/v1/upload-from-url
Authorization: <token>
Content-Type: application/json

{ "url": "https://cdn.example.com/image.jpg" }
```

- URL **HTTPS publique** (protection SSRF).
- Même contraintes MIME / taille.

> Si `RESTRICT_UPLOAD_DOMAINS` est défini sur le serveur, les médias d’un post doivent provenir de ce domaine (typiquement l’upload Postiz).

---

## 7. Trouver un créneau libre

Respecte les **time slots** configurés sur le canal (heures préférées).

```http
GET /public/v1/find-slot/:id
Authorization: <token>
```

`:id` = id d’intégration.

Réponse :

```json
{ "date": "2026-07-22T07:40:00.000Z" }
```

Utilise cette date dans `POST /posts` avec `"type": "schedule"`.

---

## 8. Créer / planifier / publier un post

```http
POST /public/v1/posts
Authorization: <token>
Content-Type: application/json
```

### 8.1 Corps (`CreatePostDto`)

| Champ | Type | Description |
|-------|------|-------------|
| `type` | `"draft"` \| `"schedule"` \| `"now"` \| `"update"` | Mode |
| `date` | ISO date-string | Date/heure de publication (obligatoire) |
| `shortLink` | boolean | Raccourcir les liens si service configuré |
| `tags` | `{ value, label }[]` | Tags internes Postiz |
| `posts` | array | Un élément par canal / thread |
| `order` | string? | Optionnel |
| `inter` | number? | Optionnel |
| `creationMethod` | `"API"` \| `"CLI"` | Métadonnée (défaut `API`) |

Chaque élément de `posts` :

| Champ | Description |
|-------|-------------|
| `integration.id` | Id du canal (`GET /integrations`) |
| `value` | Array de contenus (1 = post simple ; plusieurs = thread / carousel selon provider) |
| `value[].content` | Texte |
| `value[].image` | Array `{ id, path, alt?, thumbnail? }` |
| `value[].delay` | Délai optionnel entre items |
| `settings` | Settings provider (souvent auto-enrichi avec `__type`) |

### 8.2 Publier immédiatement

```json
{
  "type": "now",
  "date": "2026-07-21T18:00:00.000Z",
  "shortLink": false,
  "tags": [],
  "posts": [
    {
      "integration": { "id": "INTEGRATION_ID" },
      "value": [
        {
          "content": "Hello depuis l’API publique 👋",
          "image": []
        }
      ],
      "settings": {}
    }
  ]
}
```

Le backend valide le contenu, crée le post, et l’**orchestrator Temporal** déclenche l’envoi vers le réseau.

### 8.3 Planifier

```json
{
  "type": "schedule",
  "date": "2026-07-25T08:00:00.000Z",
  "shortLink": false,
  "tags": [{ "value": "campaign", "label": "Campaign" }],
  "posts": [
    {
      "integration": { "id": "INTEGRATION_ID" },
      "value": [
        {
          "content": "Post planifié",
          "image": [
            { "id": "MEDIA_ID", "path": "https://.../file.jpg" }
          ]
        }
      ],
      "settings": {
        "post_as_images_carousel": false
      }
    }
  ]
}
```

Astuce : récupère d’abord `date` via `GET /find-slot/:id`.

### 8.4 Brouillon

```json
{
  "type": "draft",
  "date": "2026-07-25T08:00:00.000Z",
  "shortLink": false,
  "tags": [],
  "posts": [ /* ... */ ]
}
```

Les brouillons sont moins stricts sur la validation settings / longueur.

### 8.5 Exemple curl (now)

```bash
curl -s -X POST http://localhost:3000/public/v1/posts \
  -H "Authorization: VOTRE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "now",
    "date": "2026-07-21T18:00:00.000Z",
    "shortLink": false,
    "tags": [],
    "posts": [{
      "integration": { "id": "INTEGRATION_ID" },
      "value": [{ "content": "Test API", "image": [] }],
      "settings": {}
    }]
  }'
```

---

## 9. Lister, modifier, supprimer des posts

### 9.1 Lister

```http
GET /public/v1/posts?startDate=2026-07-01T00:00:00.000Z&endDate=2026-07-31T23:59:59.000Z
GET /public/v1/posts?startDate=...&endDate=...&customer=<customer_id>
Authorization: <token>
```

`startDate` et `endDate` sont **obligatoires** (ISO).

### 9.2 Contenu manquant (médias / release)

```http
GET /public/v1/posts/:id/missing
```

### 9.3 Changer le statut

```http
PUT /public/v1/posts/:id/status
Content-Type: application/json

{ "status": "draft" | "schedule" }
```

### 9.4 Mettre à jour un release id

```http
PUT /public/v1/posts/:id/release-id
Content-Type: application/json

{ "releaseId": "..." }
```

### 9.5 Supprimer

Par id de post (supprime le **groupe**) :

```http
DELETE /public/v1/posts/:id
```

Par groupe :

```http
DELETE /public/v1/posts/group/:group
```

---

## 10. Notifications

```http
GET /public/v1/notifications?page=0
Authorization: <token>
```

Pagination via `page` (défaut `0`).

---

## 11. Analytics

### Par canal

```http
GET /public/v1/analytics/:integration?date=<jours_ou_param>
Authorization: <token>
```

`:integration` = id d’intégration.

### Par post

```http
GET /public/v1/analytics/post/:postId?date=<nombre>
Authorization: <token>
```

---

## 12. Groupes clients

```http
GET /public/v1/groups
Authorization: <token>
```

```json
[{ "id": "...", "name": "Client A" }]
```

Utile pour filtrer `GET /integrations?group=` et `GET /posts?customer=`.

---

## 13. Vidéo (génération / fonctions)

Si l’instance a les features vidéo activées :

```http
POST /public/v1/generate-video
Content-Type: application/json

{ /* VideoDto */ }
```

```http
POST /public/v1/video/function
Content-Type: application/json

{
  "identifier": "...",
  "functionName": "...",
  "params": {}
}
```

---

## 14. SDK officiel

Package monorepo `apps/sdk` — classe `Postiz` :

```ts
import Postiz from '@gitroom/sdk'; // selon packaging

const client = new Postiz(apiKey, 'http://localhost:3000');

await client.integrations();
await client.upload(buffer, 'png');
await client.post({ /* CreatePostDto */ });
await client.postList({ startDate, endDate });
await client.deletePost(id);
```

Le SDK couvre le cœur posts / upload / integrations ; le reste se fait en HTTP direct.

---

## 15. Limites, erreurs, prérequis

### Prérequis runtime

Pour qu’une publication **planifiée** ou **now** parte vraiment :

- Backend Postiz (`apps/backend`)
- Orchestrator Temporal (`apps/orchestrator`)
- Postgres + Redis + Temporal

Sans orchestrator, l’API peut créer le post en base mais l’envoi réseau n’aboutira pas.

### Rate limiting

Les `POST /public/v1/posts` sont throttlés (clé = org). Variable d’env typique : `API_LIMIT` (requêtes / fenêtre horaire côté instance).

### Erreurs fréquentes

| Code | Cause |
|------|--------|
| `401` | Pas de clé / clé invalide / pas d’abonnement |
| `400` | Validation post (trop long, settings, média, provider) |
| `400` | Fichier trop gros / MIME non supporté |
| Quota posts | Policy `POSTS_PER_MONTH` (plan) |

Les erreurs de validation post sont renvoyées de façon lisible (provider + message).

La clé API reste côté serveur : un front tiers qui appelle directement `/public/v1` se heurtera au CORS (origines limitées à `FRONTEND_URL` / `MAIN_URL`).

---

## 16. Parcours type bout-en-bout

```text
1. Obtenir API Key (Settings → Developers → Access)
2. GET  /is-connected
3. GET  /integrations                    → choisir integration.id
   (sinon) GET /social/linkedin → OAuth → recharger /integrations
4. POST /upload  (ou /upload-from-url)   → media.id + media.path
5. GET  /find-slot/:integrationId        → date ISO
6. POST /posts  type=schedule|now|draft
7. GET  /posts?startDate&endDate         → suivi
8. GET  /analytics/...                   → perf (optionnel)
9. DELETE /posts/:id                     → annuler si besoin
```

### Checklist minimale « publier sur LinkedIn »

- [ ] Clé API valide
- [ ] Canal LinkedIn connecté (`identifier: "linkedin"`)
- [ ] Orchestrator + Temporal up
- [ ] `POST /posts` avec `type: "now"` ou `schedule` + `date`
- [ ] Médias éventuels uploadés via `/upload*`

---

## Référence code source

| Sujet | Fichier |
|-------|---------|
| Routes publiques | `apps/backend/src/public-api/routes/v1/public.integrations.controller.ts` |
| Auth API Key | `apps/backend/src/services/auth/public.auth.middleware.ts` |
| DTO création post | `libraries/nestjs-libraries/src/dtos/posts/create.post.dto.ts` |
| SDK | `apps/sdk/src/index.ts` |

Swagger backend (si activé sur l’instance) : souvent disponible sur le port API (ex. `/docs` selon config).

---

## Licence

Postiz est sous **AGPL-3.0**. Si tu redistribues un service basé dessus, vérifie tes obligations de licence.
