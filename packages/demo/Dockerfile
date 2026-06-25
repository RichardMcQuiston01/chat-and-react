# ── Stage 1: build ────────────────────────────────────────────────────────────
FROM oven/bun:1-alpine AS builder

WORKDIR /app

# Copy manifests + lockfile first — install layer is cached until these change
COPY package.json bun.lock tsconfig.base.json ./
COPY packages/core/package.json           ./packages/core/
COPY packages/web/package.json            ./packages/web/
COPY packages/adapters/package.json       ./packages/adapters/
COPY packages/demo/package.json           ./packages/demo/
COPY packages/schema-builder/package.json ./packages/schema-builder/

RUN bun install --frozen-lockfile

# Copy source (node_modules and dist are excluded via .dockerignore)
COPY packages/core/ ./packages/core/
COPY packages/web/  ./packages/web/
COPY packages/demo/ ./packages/demo/

# Build in dependency order: core → web → demo
RUN cd packages/core && bun run build
RUN cd packages/web  && bun run build
RUN cd packages/demo && bun run build

# ── Stage 2: serve ────────────────────────────────────────────────────────────
FROM nginx:alpine
COPY --from=builder /app/packages/demo/dist /usr/share/nginx/html
EXPOSE 80
