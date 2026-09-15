FROM nginx:1.27-alpine

COPY html/ /usr/share/nginx/html/
COPY 40-render-config.sh /docker-entrypoint.d/40-render-config.sh
RUN chmod +x /docker-entrypoint.d/40-render-config.sh

# Overridden per environment (dev/beta/prod) via the Kubernetes ConfigMap -
# this default only applies to plain `docker run`/local Compose use.
ENV API_BASE_URL=http://localhost:8080

EXPOSE 80
