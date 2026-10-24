# ==========================================
# Unified Production Dockerfile for Render / Cloud Deployment
# Multi-stage build: React Frontend + FastAPI Backend
# ==========================================

# Stage 1: Build Vite React Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./
RUN npm run build

# Stage 2: Production Python Backend + Static Frontend
FROM python:3.12-slim
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application code
COPY backend/ ./backend/

# Copy compiled frontend assets from builder stage
COPY --from=frontend-builder /app/frontend/dist ./frontend_dist
ENV FRONTEND_DIST_DIR=/app/frontend_dist

# Render automatically provides $PORT (default 10000)
ENV PORT=10000
EXPOSE 10000 8000

# Launch FastAPI app with dynamic port binding
CMD ["sh", "-c", "cd backend && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-10000}"]
