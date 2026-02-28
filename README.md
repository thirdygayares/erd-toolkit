# ERD Toolkit

PostgreSQL-first ERD app that lets users import a schema, edit it visually, and export SQL/DBML.

## Overview

This repository is organized into three parts:

- `frontend/`: Next.js App Router client for the ERD editor UI.
- `backend/`: backend service scaffold (target architecture is FastAPI).
- `database/`: Flyway migrations for PostgreSQL schemas, contracts, and RLS foundation.

Current state:

- Frontend is scaffolded and ready for feature implementation.
- Database has baseline migrations and API contract structure.
- Backend is still in early scaffold stage.

## Tech Stack

- Frontend: Next.js 16, React 19, TypeScript
- Styling/UI: Tailwind CSS 4, shadcn/ui setup, Radix UI, Lucide Icons
- Backend (target): FastAPI + Pydantic
- Database: PostgreSQL
- Migrations: Flyway
- Lint/Format: Biome
- Package manager: pnpm

## Libraries

### Frontend runtime dependencies

- `next`
- `react`
- `react-dom`
- `class-variance-authority`
- `clsx`
- `tailwind-merge`
- `radix-ui`
- `lucide-react`

### Frontend dev dependencies

- `typescript`
- `@biomejs/biome`
- `tailwindcss`
- `@tailwindcss/postcss`
- `shadcn`
- `tw-animate-css`
- `babel-plugin-react-compiler`
- `@types/node`
- `@types/react`
- `@types/react-dom`

### Database and SQL platform

PostgreSQL extensions used in migrations:
- `pgcrypto`
- `citext`
- Flyway SQL migrations under `database/sql/migrations`

## Key Docs

- `TECH.MD`: architecture and stack decisions
- `PLAN.MD`: phased delivery roadmap
- `FEATURES.MD`: product scope and acceptance criteria
- `RLS.MD`: row-level security model and rules
- `DATA.MD`: data model and schema contracts

## Quick Start

### Frontend

```bash
cd frontend
pnpm install
pnpm dev
```

Open `http://localhost:3000`.

### Database migrations

```bash
cd database
flyway -configFiles=flyway.conf migrate
```

Update `flyway.conf` credentials if your local PostgreSQL setup is different.
