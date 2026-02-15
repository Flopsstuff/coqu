FROM node:22-alpine AS base
RUN corepack enable

WORKDIR /app

# Install dependencies
COPY package.json yarn.lock .yarnrc.yml ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/api/package.json ./packages/api/
COPY packages/web/package.json ./packages/web/

RUN yarn install --immutable

# Copy source
COPY tsconfig.base.json ./
COPY packages/shared/ ./packages/shared/
COPY packages/api/ ./packages/api/

# Generate Prisma client
RUN yarn workspace @coqu/api prisma:generate

# Build (tsc -b --force rebuilds shared + api, avoids Docker timestamp issues)
FROM base AS builder
RUN yarn workspace @coqu/api build

# Production
FROM node:22-alpine AS production
RUN apk upgrade --no-cache

WORKDIR /app

COPY --from=base /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/api/dist ./packages/api/dist
COPY packages/shared/package.json ./packages/shared/
COPY packages/api/package.json ./packages/api/
COPY packages/api/prisma ./packages/api/prisma
COPY package.json ./

WORKDIR /app/packages/api

EXPOSE 4000

CMD ["sh", "-c", "npx prisma migrate deploy --schema=prisma/schema.prisma && node dist/index.js"]
