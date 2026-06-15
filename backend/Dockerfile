# ===== BACKEND-ONLY DOCKERFILE =====
# Use this if deploying backend and frontend separately

FROM node:20-alpine AS build

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source
COPY . .

# Build TypeScript
RUN pnpm run build

# ===== PRODUCTION STAGE =====
FROM node:20-alpine AS production

LABEL maintainer="tasker"

WORKDIR /app

# Copy built files and dependencies
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./

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
