# AreaScan Web (`apps/web`)

Production-grade **Next.js 15** (App Router) + **TypeScript** frontend for the
AreaScan tourism platform.

## Stack

- **Next.js 15** (App Router, `src/app`, `output: 'standalone'`)
- **React 19** + React DOM 19
- **TypeScript 5** (strict, `@/*` -> `./src/*` path alias)
- **Tailwind CSS 3.4** + PostCSS + Autoprefixer
- **@tanstack/react-query v5** (server-state caching)
- **zustand v5** (client auth state)
- **@googlemaps/js-api-loader** (Maps JS API loader)

## Prerequisites

- Node.js 22.x
- The AreaScan API running on `http://localhost:8000` (see `apps/api`)

## Getting started

```bash
cd apps/web
cp .env.example .env.local   # fill in values as needed
npm install
npm run dev                  # http://localhost:3000
```

The home page (`src/app/page.tsx`) calls the API client against
`GET /health` and renders the JSON status, so `docker compose up` visibly
proves web <-> api connectivity.

## Environment variables

| Variable                     | Description                                         | Example                          |
| ---------------------------- | --------------------------------------------------- | -------------------------------- |
| `NEXT_PUBLIC_API_BASE_URL`   | Versioned API base URL (browser-visible)            | `http://localhost:8000/api/v1`   |
| `NEXT_PUBLIC_GOOGLE_MAPS_KEY`| Google Maps JavaScript API key (browser-restricted) | `AIza...`                        |

> Inside `docker-compose`, API/DB/Redis hosts are service names (`api`, `db`,
> `redis`). On the host machine they are `localhost`.

## Scripts

| Script              | Description                                  |
| ------------------- | -------------------------------------------- |
| `npm run dev`       | Start the dev server on port 3000            |
| `npm run build`     | Production build (standalone output)         |
| `npm run start`     | Serve the production build on port 3000      |
| `npm run lint`      | ESLint (`next/core-web-vitals`)              |
| `npm run typecheck` | `tsc --noEmit` strict type check             |

## Docker

The `Dockerfile` is a multi-stage build (`deps` -> `build` -> `runner`) using
Next.js standalone output. The runner stage runs as a non-root user and
exposes port `3000`.

```bash
docker build -t areascan-web .
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1 \
  areascan-web
```

## Project layout

```
src/
  app/
    globals.css      Tailwind directives + base styles
    layout.tsx       Root layout (html lang="th", Providers, Noto Sans Thai)
    page.tsx         Home page -> renders API /health status
  components/
    providers.tsx    React Query provider (singleton QueryClient)
  lib/
    api-client.ts    Typed fetch wrapper + ApiError (error envelope)
    query-keys.ts    Centralized React Query key factory
  stores/
    auth-store.ts    zustand auth store (accessToken, user, setAuth, clear)
```
