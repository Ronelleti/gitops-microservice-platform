#!/bin/sh
# Runs automatically at container startup - the official nginx image
# executes every *.sh in /docker-entrypoint.d/ before starting nginx.
set -eu
envsubst '${API_BASE_URL}' \
  < /usr/share/nginx/html/config.js.template \
  > /usr/share/nginx/html/config.js
