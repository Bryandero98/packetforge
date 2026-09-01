// A single self-contained page - no build step, no external dependencies,
// no framework - deliberately, since this is the one part of PacketForge
// meant to be opened directly in a browser by a human, not consumed by a
// tool or an agent. Every request it makes is to PacketForge's own
// already-existing REST API (GET /projects, GET/POST /graph/tasks,
// GET /graph/tasks/:id, GET /graph/search) - no new backend surface
// exists just for this page.
export const DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>PacketForge</title>
<style>
  :root {
    --bg: #0f1115;
    --panel: #171a21;
    --panel-2: #1e222b;
    --border: #2a2f3a;
    --text: #e6e9ef;
    --text-dim: #9aa3b2;
    --accent: #7c9eff;
    --accent-dim: #3a4a7a;
    --ok: #5fd68a;
    --warn: #f2c94c;
    --debt: #f28b6c;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: var(--bg);
    color: var(--text);
  }
  header {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 14px 20px;
    background: var(--panel);
    border-bottom: 1px solid var(--border);
    flex-wrap: wrap;
  }
  header h1 {
    font-size: 18px;
    margin: 0;
    font-weight: 700;
    letter-spacing: -0.02em;
  }
  header h1 span { color: var(--accent); }
  select, input, button {
    background: var(--panel-2);
    color: var(--text);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 7px 10px;
    font-size: 13px;
  }
  input[type="text"] { min-width: 240px; }
  button {
    cursor: pointer;
    background: var(--accent-dim);
    border-color: var(--accent);
  }
  button:hover { background: var(--accent); color: #0f1115; }
  .status-pill {
    font-size: 11px;
    padding: 4px 10px;
    border-radius: 999px;
  }
  #healthPill { margin-left: auto; }
  .health-ok { background: rgba(95,214,138,0.15); color: var(--ok); border: 1px solid var(--ok); }
  .health-bad { background: rgba(242,139,108,0.15); color: var(--debt); border: 1px solid var(--debt); }
  main { padding: 20px; }
  #board {
    display: flex;
    gap: 16px;
    overflow-x: auto;
    padding-bottom: 12px;
  }
  .column {
    min-width: 260px;
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 12px;
    flex-shrink: 0;
  }
  .column h2 {
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-dim);
    margin: 0 0 10px 2px;
    display: flex;
    justify-content: space-between;
  }
  .card {
    background: var(--panel-2);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 10px;
    margin-bottom: 8px;
    cursor: pointer;
    transition: border-color 0.15s;
  }
  .card:hover { border-color: var(--accent); }
  .card .id {
    font-size: 11px;
    color: var(--accent);
    font-family: ui-monospace, monospace;
  }
  .card .title { font-size: 13px; margin-top: 4px; }
  .empty { color: var(--text-dim); font-size: 13px; padding: 8px 2px; }
  #searchResults {
    margin-top: 16px;
    display: none;
  }
  #searchResults.visible { display: block; }
  .result {
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 10px 14px;
    margin-bottom: 8px;
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
  }
  .result:hover { border-color: var(--accent); }
  .result .note { font-size: 13px; flex: 1; }
  .result .meta { font-size: 11px; color: var(--text-dim); white-space: nowrap; }
  .kind-decision { color: var(--ok); }
  .kind-debt { color: var(--debt); }
  #overlay {
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.55);
    align-items: center;
    justify-content: center;
    z-index: 10;
  }
  #overlay.visible { display: flex; }
  #detail {
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 12px;
    width: min(560px, 92vw);
    max-height: 82vh;
    overflow-y: auto;
    padding: 20px;
  }
  #detail h2 { margin: 0 0 4px; font-size: 17px; }
  #detail .meta { color: var(--text-dim); font-size: 12px; margin-bottom: 16px; }
  #detail h3 {
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-dim);
    margin: 18px 0 8px;
  }
  #detail .note {
    background: var(--panel-2);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 8px 10px;
    font-size: 13px;
    margin-bottom: 6px;
  }
  #detail .note .when { color: var(--text-dim); font-size: 11px; margin-top: 3px; }
  #closeDetail { float: right; }
  .status-select { width: 140px; margin-top: 10px; }
</style>
</head>
<body>
  <header>
    <h1>Packet<span>Forge</span></h1>
    <select id="projectSelect"></select>
    <input type="text" id="searchInput" placeholder="Semantic search (decisions & debt)..." />
    <button id="searchBtn">Search</button>
    <button id="clearSearchBtn" style="display:none">Clear</button>
    <span id="healthPill" class="status-pill">checking...</span>
  </header>
  <main>
    <div id="searchResults"></div>
    <div id="board"></div>
  </main>

  <div id="overlay">
    <div id="detail"></div>
  </div>

<script>
const API = '';
let currentProject = '';

async function fetchJson(path) {
  const res = await fetch(API + path);
  if (!res.ok) throw new Error('request failed: ' + path + ' (' + res.status + ')');
  return res.json();
}

async function loadHealth() {
  const pill = document.getElementById('healthPill');
  try {
    const h = await fetchJson('/health');
    pill.textContent = h.status === 'ok' ? 'healthy' : 'degraded';
    pill.className = 'status-pill ' + (h.status === 'ok' ? 'health-ok' : 'health-bad');
  } catch {
    pill.textContent = 'unreachable';
    pill.className = 'status-pill health-bad';
  }
}

async function loadProjects() {
  const projects = await fetchJson('/projects');
  const select = document.getElementById('projectSelect');
  select.innerHTML = '<option value="">All projects</option>' +
    projects.map(p => \`<option value="\${p.id}">\${p.name}</option>\`).join('');
  select.value = currentProject;
}

function groupByStatus(tasks) {
  const groups = {};
  for (const t of tasks) {
    (groups[t.status] ||= []).push(t);
  }
  return groups;
}

async function loadBoard() {
  const qs = currentProject ? '?projectId=' + encodeURIComponent(currentProject) : '';
  const tasks = await fetchJson('/graph/tasks' + qs);
  const board = document.getElementById('board');
  const groups = groupByStatus(tasks);
  const statuses = Object.keys(groups).sort();

  if (statuses.length === 0) {
    board.innerHTML = '<div class="empty">No tasks yet' + (currentProject ? ' in this project.' : '.') + '</div>';
    return;
  }

  board.innerHTML = statuses.map(status => \`
    <div class="column">
      <h2>\${status} <span>\${groups[status].length}</span></h2>
      \${groups[status].map(t => \`
        <div class="card" onclick="openTask('\${t.id}')">
          <div class="id">\${t.id}</div>
          <div class="title">\${t.title}</div>
        </div>
      \`).join('')}
    </div>
  \`).join('');
}

async function openTask(id) {
  const task = await fetchJson('/graph/tasks/' + encodeURIComponent(id));
  const overlay = document.getElementById('overlay');
  const detail = document.getElementById('detail');

  const renderNotes = (notes, emptyLabel) => notes.length === 0
    ? '<div class="empty">' + emptyLabel + '</div>'
    : notes.map(n => \`<div class="note">\${n.note}<div class="when">\${new Date(n.loggedAt).toLocaleString()}</div></div>\`).join('');

  detail.innerHTML = \`
    <button id="closeDetail" onclick="closeDetail()">Close</button>
    <h2>\${task.title}</h2>
    <div class="meta">\${task.id} · project: \${task.projectId} · status: \${task.status}</div>
    <h3>Decisions</h3>
    \${renderNotes(task.decisions, 'None recorded.')}
    <h3>Debt</h3>
    \${renderNotes(task.debt, 'None recorded.')}
  \`;
  overlay.classList.add('visible');
}

function closeDetail() {
  document.getElementById('overlay').classList.remove('visible');
}

async function runSearch() {
  const q = document.getElementById('searchInput').value.trim();
  if (!q) return;
  const qs = '?q=' + encodeURIComponent(q) + (currentProject ? '&projectId=' + encodeURIComponent(currentProject) : '');
  const resultsEl = document.getElementById('searchResults');
  try {
    const results = await fetchJson('/graph/search' + qs);
    resultsEl.innerHTML = results.length === 0
      ? '<div class="empty">No matches.</div>'
      : results.map(r => \`
          <div class="result" onclick="openTask('\${r.task.id}')">
            <div>
              <span class="kind-\${r.match.kind}">[\${r.match.kind}]</span>
              <span class="note">\${r.match.note}</span>
            </div>
            <div class="meta">\${r.task.id} · \${(r.match.similarity * 100).toFixed(0)}% match</div>
          </div>
        \`).join('');
  } catch (e) {
    resultsEl.innerHTML = '<div class="empty">' + (e.message.includes('503') ? 'Semantic search needs OPENAI_API_KEY configured on the server.' : 'Search failed.') + '</div>';
  }
  resultsEl.classList.add('visible');
  document.getElementById('clearSearchBtn').style.display = 'inline-block';
}

function clearSearch() {
  document.getElementById('searchInput').value = '';
  document.getElementById('searchResults').classList.remove('visible');
  document.getElementById('clearSearchBtn').style.display = 'none';
}

document.getElementById('projectSelect').addEventListener('change', (e) => {
  currentProject = e.target.value;
  loadBoard();
});
document.getElementById('searchBtn').addEventListener('click', runSearch);
document.getElementById('searchInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') runSearch(); });
document.getElementById('clearSearchBtn').addEventListener('click', clearSearch);
document.getElementById('overlay').addEventListener('click', (e) => { if (e.target.id === 'overlay') closeDetail(); });

loadHealth();
loadProjects().then(loadBoard);
setInterval(loadHealth, 15000);
</script>
</body>
</html>
`;
