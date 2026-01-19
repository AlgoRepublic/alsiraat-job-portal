# ===== BACKEND-ONLY DOCKERFILE =====
# Use this if deploying backend and frontend separately

FROM node:20-alpine AS build

WORKDIR /app

# Copy package files
COPY package.json ./

# Install dependencies
RUN npm install

# Copy source
COPY . .

# Build TypeScript
RUN npm run build

# ===== PRODUCTION STAGE =====
FROM node:20-alpine AS production

WORKDIR /app

# Copy built files and dependencies
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Expose port
EXPOSE 8080

# Start server
CMD ["node", "dist/server.js"]
