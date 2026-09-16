import { useEffect, useState } from "react";
import "./App.css";

// Injected at container startup (see index.html + config.js.template) so the
// SAME built image can be promoted across dev/beta/prod without rebuilding -
// each environment's ConfigMap sets a different value at runtime.
const API_BASE_URL = window.API_BASE_URL || "";

export default function App() {
  const [items, setItems] = useState([]);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadItems() {
    try {
      const res = await fetch(`${API_BASE_URL}/api/items`);
      if (!res.ok) throw new Error(`API returned ${res.status}`);
      setItems(await res.json());
      setError("");
    } catch (err) {
      setError(`Could not reach API at ${API_BASE_URL}: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadItems();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) throw new Error(`API returned ${res.status}`);
      setName("");
      setError("");
      await loadItems();
    } catch (err) {
      setError(`Could not add item: ${err.message}`);
    }
  }

  return (
    <main className="app">
      <h1>Items</h1>
      <form onSubmit={handleSubmit} className="item-form">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New item name"
          required
        />
        <button type="submit">Add</button>
      </form>

      {error && <p className="error">{error}</p>}

      {loading ? (
        <p className="muted">Loading…</p>
      ) : items.length === 0 ? (
        <p className="muted">No items yet.</p>
      ) : (
        <ul className="item-list">
          {items.map((item) => (
            <li key={item.id}>{item.name}</li>
          ))}
        </ul>
      )}
    </main>
  );
}
