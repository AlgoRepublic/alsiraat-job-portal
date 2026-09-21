# ===== BACKEND-ONLY DOCKERFILE =====
# Build context: repository root (see .gitlab-ci.yml / docker-compose.yml).

FROM node:20-alpine AS build

WORKDIR /app/backend

RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

# Install dependencies (local workspace package lives at ../shared)
COPY backend/package.json backend/pnpm-lock.yaml backend/pnpm-workspace.yaml ./
COPY shared/package.json shared/tsconfig.json ../shared/
COPY shared/*.ts ../shared/

RUN pnpm install --frozen-lockfile

COPY backend/ .
COPY shared/ ../shared/

# pnpm snapshots file:../shared at install time (before dist exists); refresh after compile.
RUN pnpm run build && pnpm install --frozen-lockfile

# ===== PRODUCTION STAGE =====
FROM node:20-alpine AS production

LABEL maintainer="tasker"

WORKDIR /app

# Copy built files and dependencies
COPY --from=build /app/backend/dist ./dist
COPY --from=build /app/backend/node_modules ./node_modules
COPY --from=build /app/backend/package.json ./

# Version baked in at build time by CI (git tag or env-SHA). Fallback for local builds.
ARG APP_VERSION=local
ENV APP_VERSION=$APP_VERSION

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Expose port
EXPOSE 8080

# Start server
CMD ["node", "dist/server.js"]
