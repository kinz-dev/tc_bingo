/**
 * 印卡 — lays the cards out as A4 sheets. What is on screen is what prints.
 */

import { FREE, MAX_ID, formatId, makeCard } from './cards.js';

const $ = (id) => document.getElementById(id);
const STORE = 'tcbingo.print.v1';
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

function cardHtml(id, title) {
  const rows = makeCard(id)
    .map((row) => row
      .map((n) => (n === FREE ? '<td class="free"><span>FREE</span><small>譚仔</small></td>' : `<td>${n}</td>`))
      .join(''))
    .map((cells) => `<tr>${cells}</tr>`)
    .join('');
  return `
    <article class="card">
      <header class="card-head"><span class="card-title">${esc(title)}</span><span class="card-id">No. ${formatId(id)}</span></header>
      <table>
        <thead><tr>${[...'BINGO'].map((l) => `<th class="col-${l}">${l}</th>`).join('')}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <footer class="card-foot"><span>夠一條線就大聲叫 Bingo！</span><span class="card-id-small">#${formatId(id)}</span></footer>
    </article>`;
}

function render() {
  const from = clamp(Number($('from').value) || 1, 1, MAX_ID);
  const count = clamp(Number($('count').value) || 1, 1, Math.min(200, MAX_ID - from + 1));
  const perPage = Number($('perPage').value);
  const title = $('title').value.trim() || '譚仔揼波拿';
  const ids = Array.from({ length: count }, (_, i) => from + i);

  const sheets = [];
  for (let i = 0; i < ids.length; i += perPage) {
    sheets.push(`<section class="sheet per-${perPage}">${ids.slice(i, i + perPage).map((id) => cardHtml(id, title)).join('')}</section>`);
  }
  $('sheets').innerHTML = sheets.join('');
  $('summary').textContent = `卡號 ${formatId(from)} – ${formatId(from + count - 1)}，共 ${count} 張，${sheets.length} 頁`;
  try { localStorage.setItem(STORE, JSON.stringify({ from, count, perPage, title })); } catch { /* fine */ }
}

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, Math.floor(n)));

try {
  const saved = JSON.parse(localStorage.getItem(STORE));
  // A title still at the old default follows the rename.
  if (saved?.title === '譚仔賓果夜') delete saved.title;
  if (saved) for (const k of ['from', 'count', 'perPage', 'title']) if (saved[k] != null) $(k).value = saved[k];
} catch { /* defaults */ }

for (const id of ['from', 'count', 'perPage', 'title']) $(id).addEventListener('input', render);
$('printBtn').addEventListener('click', () => window.print());
render();
