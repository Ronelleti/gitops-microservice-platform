# Custom Postgres image with schema baked in via the standard
# docker-entrypoint-initdb.d mechanism (runs once, on first startup against
# an empty data directory).
FROM postgres:16-alpine

COPY init.sql /docker-entrypoint-initdb.d/01-init.sql
