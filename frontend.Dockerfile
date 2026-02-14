# ===== FRONTEND-ONLY DOCKERFILE =====
# Use this if deploying frontend separately (e.g., Firebase Hosting, Cloud Run, etc.)

FROM node:20-alpine AS build

WORKDIR /app

# Copy package files
COPY package.json yarn.lock ./

# Install dependencies
RUN yarn install --frozen-lockfile

# Copy source (excluding backend)
COPY . .
RUN rm -rf backend

# Build the frontend
RUN yarn build

# ===== PRODUCTION - NGINX =====
FROM nginx:alpine AS production

LABEL maintainer="tasker"

# Copy built files to nginx
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 8080 for Cloud Run
EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
