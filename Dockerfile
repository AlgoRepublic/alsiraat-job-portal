# ===== FRONTEND BUILD STAGE =====
FROM node:20-alpine AS frontend-build

WORKDIR /app/frontend

# Copy frontend package files
COPY package.json yarn.lock ./

# Install dependencies
RUN yarn install --frozen-lockfile

# Copy frontend source
COPY . .

# Remove backend folder from frontend context
RUN rm -rf backend

# Build frontend
RUN yarn build

# ===== BACKEND BUILD STAGE =====
FROM node:20-alpine AS backend-build

WORKDIR /app/backend

# Copy backend package files
COPY backend/package.json ./

# Install dependencies
RUN npm install

# Copy backend source
COPY backend/ .

# Build backend (TypeScript to JavaScript)
RUN npm run build

# ===== PRODUCTION STAGE =====
FROM node:20-alpine AS production

WORKDIR /app

# Install serve for static files (optional, backend can serve)
RUN npm install -g serve

# Copy built backend
COPY --from=backend-build /app/backend/dist ./backend/dist
COPY --from=backend-build /app/backend/node_modules ./backend/node_modules
COPY --from=backend-build /app/backend/package.json ./backend/

# Copy built frontend to be served by backend
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Expose port (Cloud Run uses 8080 by default)
EXPOSE 8080

WORKDIR /app/backend

# Start the backend server
CMD ["node", "dist/server.js"]
