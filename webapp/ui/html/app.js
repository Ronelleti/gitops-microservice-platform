const apiBase = window.API_BASE_URL || "";

async function loadItems() {
  const statusEl = document.getElementById("status");
  const listEl = document.getElementById("item-list");
  try {
    const resp = await fetch(`${apiBase}/api/items`);
    if (!resp.ok) throw new Error(`API returned ${resp.status}`);
    const items = await resp.json();
    listEl.innerHTML = items.map((i) => `<li>${escapeHtml(i.name)}</li>`).join("");
    statusEl.textContent = "";
  } catch (err) {
    statusEl.textContent = `Could not reach API at ${apiBase}: ${err.message}`;
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

document.getElementById("item-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const input = document.getElementById("item-name");
  const name = input.value.trim();
  if (!name) return;

  const statusEl = document.getElementById("status");
  try {
    const resp = await fetch(`${apiBase}/api/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!resp.ok) throw new Error(`API returned ${resp.status}`);
    input.value = "";
    statusEl.textContent = "";
    await loadItems();
  } catch (err) {
    statusEl.textContent = `Could not add item: ${err.message}`;
  }
});

loadItems();
