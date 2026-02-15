FROM node:20-alpine AS builder
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
COPY packages/web/ ./packages/web/

# Build shared types, then web (skip tsc in Docker, Vite handles bundling)
RUN yarn workspace @coqu/shared build
RUN cd packages/web && npx vite build

# Serve with nginx
FROM nginx:alpine AS production

COPY --from=builder /app/packages/web/dist /usr/share/nginx/html
COPY packages/web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
