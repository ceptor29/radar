# Radar

Radar is a governance, risk, and compliance (GRC) platform built from the product plans in this repo (see `GRC Platform - Full-Proof Product & Engineering Plan.md` and its v2).

This is the **P1 Foundation**: a working full-stack app with risk scoring, controls, evidence management, RBAC, and an audit trail.

## Stack

- **Monorepo** with npm workspaces (`apps/web`, `apps/server`, `shared`)
- **Frontend**: React 19, Tailwind CSS v4, Recharts, Motion, Vite
- **Backend**: Express, tRPC v11, Drizzle ORM, SQLite (`better-sqlite3`)
- **Shared**: zod schemas, RBAC permission matrix, normative scoring engine

## Getting started

Requires Node.js 20+ and npm.

```bash
npm install          # install all workspace deps
npm run seed         # create SQLite DB, migrate, and seed demo data
npm run dev          # start server (:4000) and web (:5173)
```

Open http://localhost:5173.

## Demo accounts

| Role         | Email               |
| ------------ | ------------------- |
| Admin        | admin@acme.io       |
| Lead         | lead@acme.io        |
| Owner        | owner@acme.io       |
| Auditor      | auditor@acme.io     |

REST parity API is available at http://localhost:4000/api/v1 (demo key: `radar-demo-key`).

## Scripts

| Command           | Description                              |
| ----------------- | ---------------------------------------- |
| `npm run dev`     | Run server + web concurrently            |
| `npm run dev:server` | Run only the server                   |
| `npm run dev:web` | Run only the web app                     |
| `npm run seed`    | Migrate and seed the SQLite database     |
| `npm run test`    | Run vitest unit tests                    |
| `npm run typecheck` | Type-check server and web workspaces   |

## Features (P1)

- Risk register with inherent/residual scoring on a 5x5 heatmap
- Normative scoring engine (v2 plan, section 2.2) with append-only score history
- Control library with click-to-cycle health/status; linked risks recompute live
- Evidence attachments with drag-and-drop upload
- Framework/control mapping
- Role-based access control via a shared permission matrix
- Dashboard compliance cockpit, activity feed (audit trail), admin and directory views

## Project structure

```
apps/
  server/    Express + tRPC API, Drizzle/SQLite, REST parity layer
  web/       React SPA (Vite)
shared/
  src/       Shared schemas, RBAC permissions, scoring engine
scripts/
  diag.cjs   Headless-browser diagnostic test (puppeteer-core)
```

## Status

- **P1 Foundation**: complete
- Next phases (P2+): multi-tenant hardening, external evidence storage, OAuth/SSO, CI/CD — see the plan documents.