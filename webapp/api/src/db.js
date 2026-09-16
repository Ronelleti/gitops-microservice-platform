import pg from "pg";

const { Pool } = pg;

export const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || "webapp",
  user: process.env.DB_USER || "webapp",
  password: process.env.DB_PASSWORD || "webapp",
  // Keep the pool small and fail fast - this is a small demo service,
  // not something that should hold a cluster's connection budget hostage.
  max: 5,
  connectionTimeoutMillis: 2000,
});
