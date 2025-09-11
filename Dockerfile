# ---------- Stage 1: Build Backend ----------
FROM node:20-alpine AS backend-builder
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --omit=dev=false
COPY backend/ ./
RUN npm run build

# ---------- Stage 2: Build Frontend ----------
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci --omit=dev=false
COPY frontend/ ./
RUN npm run build

# ---------- Stage 3: Runtime (single process) ----------
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
# Render will override this; keep a local default:
ENV PORT=10000

# Backend runtime
COPY --from=backend-builder  /app/backend/package.json ./backend/package.json
COPY --from=backend-builder  /app/backend/node_modules ./backend/node_modules
COPY --from=backend-builder  /app/backend/dist ./backend/dist

# Frontend build (served by backend)
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

EXPOSE 10000
# Adjust path if your compiled entry differs
CMD ["node", "backend/dist/index.js"]
