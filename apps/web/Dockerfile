# syntax=docker/dockerfile:1

# ---------- deps: install production + dev deps for the build ----------
FROM node:22-alpine AS deps
# libc6-compat keeps some native Node modules happy on Alpine.
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based only on the lockfile/manifest for layer caching.
COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

# ---------- build: compile the Next.js standalone output ----------
FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* are inlined into the client bundle at BUILD time, so they must be
# present here (passed as build args from docker-compose / CI), not only at runtime.
ARG NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
ARG NEXT_PUBLIC_GOOGLE_MAPS_KEY=
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_GOOGLE_MAPS_KEY=$NEXT_PUBLIC_GOOGLE_MAPS_KEY

# Disable Next.js telemetry during the image build.
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---------- runner: minimal non-root runtime image ----------
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Create a dedicated non-root user/group to run the server.
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# Copy the public assets and the standalone server bundle.
COPY --from=build /app/public ./public
# The standalone output contains a minimal server.js + traced node_modules.
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
# Static assets must sit alongside the standalone server.
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

# server.js is emitted by Next.js when output: 'standalone' is set.
CMD ["node", "server.js"]
