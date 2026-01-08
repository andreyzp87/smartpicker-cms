FROM node:24-alpine AS base
RUN corepack enable && corepack prepare pnpm@9 --activate

# Build server
FROM base AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build:server

# Build admin
FROM base AS admin-builder
WORKDIR /app
COPY admin/package.json admin/pnpm-lock.yaml ./admin/
RUN cd admin && pnpm install --frozen-lockfile
COPY admin ./admin
RUN cd admin && pnpm build

# Production image
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy server build
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json .
COPY --from=builder /app/node_modules ./node_modules

# Copy admin build (served as static files)
COPY --from=admin-builder /app/admin/dist ./admin/dist

# Copy data sources
COPY data/sources ./data/sources

EXPOSE 3000
CMD ["node", "dist/index.js"]
