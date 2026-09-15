import os
from flask import Flask, jsonify, request
import psycopg2

app = Flask(__name__)

DB_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "port": os.getenv("DB_PORT", "5432"),
    "dbname": os.getenv("DB_NAME", "webapp"),
    "user": os.getenv("DB_USER", "webapp"),
    "password": os.getenv("DB_PASSWORD", "webapp"),
}


def get_connection():
    return psycopg2.connect(**DB_CONFIG)


@app.route("/healthz")
def healthz():
    # Liveness: process is up. Deliberately does NOT touch the DB — a
    # liveness probe that depends on a downstream dependency can cause
    # Kubernetes to kill and restart a perfectly healthy pod during a DB
    # blip, which just makes the outage worse.
    return jsonify({"status": "ok"}), 200


@app.route("/readyz")
def readyz():
    # Readiness: are we actually able to serve traffic right now? This one
    # SHOULD check the DB, so Kubernetes stops routing traffic to this pod
    # if the database is unreachable.
    try:
        conn = get_connection()
        conn.close()
        return jsonify({"status": "ready"}), 200
    except Exception as exc:
        return jsonify({"status": "not-ready", "error": str(exc)}), 503


@app.route("/api/items", methods=["GET"])
def list_items():
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT id, name, created_at FROM items ORDER BY id DESC")
            rows = cur.fetchall()
        items = [{"id": r[0], "name": r[1], "created_at": r[2].isoformat()} for r in rows]
        return jsonify(items)
    finally:
        conn.close()


@app.route("/api/items", methods=["POST"])
def create_item():
    data = request.get_json(silent=True) or {}
    name = data.get("name", "").strip()
    if not name:
        return jsonify({"error": "'name' is required"}), 400

    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO items (name) VALUES (%s) RETURNING id, name, created_at",
                (name,),
            )
            row = cur.fetchone()
        conn.commit()
        return jsonify({"id": row[0], "name": row[1], "created_at": row[2].isoformat()}), 201
    finally:
        conn.close()


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", 8080)))
