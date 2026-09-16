import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { createApp } from "./app.js";

function withServer(fn) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(createApp());
    server.listen(0, async () => {
      const { port } = server.address();
      try {
        await fn(`http://localhost:${port}`);
        resolve();
      } catch (err) {
        reject(err);
      } finally {
        server.close();
      }
    });
  });
}

test("healthz does not require a DB", () =>
  withServer(async (base) => {
    const res = await fetch(`${base}/healthz`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, "ok");
  }));

test("readyz reports DB state honestly (ready or not-ready, matching status code)", () =>
  withServer(async (base) => {
    const res = await fetch(`${base}/readyz`);
    const body = await res.json();
    if (body.status === "ready") {
      assert.equal(res.status, 200);
    } else {
      assert.equal(res.status, 503);
    }
  }));

test("create + list item requires a real DB - skips cleanly otherwise", () =>
  withServer(async (base) => {
    const ready = await (await fetch(`${base}/readyz`)).json();
    if (ready.status !== "ready") {
      console.log("  (skipping: no database available in this environment)");
      return;
    }

    const created = await (
      await fetch(`${base}/api/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "test-item" }),
      })
    ).json();
    assert.equal(created.name, "test-item");

    const items = await (await fetch(`${base}/api/items`)).json();
    assert.ok(items.some((i) => i.name === "test-item"));
  }));
