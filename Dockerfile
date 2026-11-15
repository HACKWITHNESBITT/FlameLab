# Build frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/. /app/
RUN npm run build

# Build backend
FROM python:3.12-slim AS backend
WORKDIR /app
COPY backend/ /app/backend/
COPY scripts/ /app/scripts/
COPY --from=frontend-builder /app/dist /app/frontend/dist

RUN pip install --no-cache-dir -r backend/requirements.txt

EXPOSE 8000
CMD ["uvicorn", "backend.app:app", "--host", "0.0.0.0", "--port", "8000"]