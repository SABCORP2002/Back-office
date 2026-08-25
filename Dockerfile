FROM node:22-alpine AS frontend-builder

WORKDIR /app

# The delivered Docker stack proxies this relative path to the internal API.
ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

COPY package.json package-lock.json ./
RUN npm ci

COPY index.html tsconfig.json tsconfig.app.json tsconfig.node.json vite.config.ts tailwind.config.js postcss.config.js ./
COPY public ./public
COPY src ./src
RUN npm run build


FROM caddy:2-alpine

COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=frontend-builder /app/dist /srv

EXPOSE 80 443
