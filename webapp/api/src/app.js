import express from "express";
import { pool } from "./db.js";

export function createApp() {
  const app = express();
  app.use(express.json());

  // Liveness: process is up. Deliberately does NOT touch the DB - see the
  // readyz comment below for why liveness and readiness ask different
  // questions.
  app.get("/healthz", (req, res) => {
    res.json({ status: "ok" });
  });

  // Readiness: are we actually able to serve traffic right now? This one
  // SHOULD check the DB, so Kubernetes stops routing traffic to this pod
  // if the database is unreachable.
  app.get("/readyz", async (req, res) => {
    try {
      const client = await pool.connect();
      client.release();
      res.json({ status: "ready" });
    } catch (err) {
      res.status(503).json({ status: "not-ready", error: err.message });
    }
  });

  app.get("/api/items", async (req, res, next) => {
    try {
      const { rows } = await pool.query(
        "SELECT id, name, created_at FROM items ORDER BY id DESC"
      );
      res.json(rows);
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/items", async (req, res, next) => {
    const name = (req.body?.name || "").trim();
    if (!name) {
      return res.status(400).json({ error: "'name' is required" });
    }
    try {
      const { rows } = await pool.query(
        "INSERT INTO items (name) VALUES ($1) RETURNING id, name, created_at",
        [name]
      );
      res.status(201).json(rows[0]);
    } catch (err) {
      next(err);
    }
  });

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    res.status(500).json({ error: err.message });
  });

  return app;
}
