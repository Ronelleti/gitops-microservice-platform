# Stage 1: build the static React bundle
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund
COPY . .
RUN npm run build

# Stage 2: serve it with nginx, same runtime-config trick as before
FROM nginx:1.27-alpine
COPY --from=build /app/dist/ /usr/share/nginx/html/
COPY 40-render-config.sh /docker-entrypoint.d/40-render-config.sh
RUN chmod +x /docker-entrypoint.d/40-render-config.sh

# Overridden per environment via the Kubernetes ConfigMap - this default
# only applies to plain `docker run`/local Compose use.
ENV API_BASE_URL=http://localhost:8080

EXPOSE 80
