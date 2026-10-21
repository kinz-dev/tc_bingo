/**
 * Paper cards with a number on them.
 *
 * A card is made from its ID and nothing else: the same ID gives the same
 * card on the print page today and on the host's console at the party, so
 * nothing has to be saved or carried between them. Read the ID off a
 * winner's card and the console rebuilds it and checks it.
 *
 * Cards are the standard 75-ball kind: five columns, B 1–15 … O 61–75,
 * the middle square FREE.
 */

export const FREE = 0;
export const MAX_ID = 9999;

// Changing this reshuffles every card ever printed. Don't, mid-party.
const SALT = 'tcbingo-card-v1';

function seed(text) {
  let h = 2166136261;
  for (const ch of text) h = Math.imul(h ^ ch.codePointAt(0), 16777619);
  return h >>> 0;
}

// mulberry32: small, fast, and the same in every browser.
function rng(a) {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 42 → "0042". */
export const formatId = (id) => String(id).padStart(4, '0');

/** "0042", "#42", "No. 42" → 42; anything else → null. */
export function parseId(text) {
  const m = String(text || '').match(/\d+/);
  if (!m) return null;
  const id = Number(m[0]);
  return id >= 1 && id <= MAX_ID ? id : null;
}

/** The card as rows: card[row][col], FREE in the middle. */
export function makeCard(id) {
  const rand = rng(seed(`${SALT}:${id}`));
  const cols = [];
  for (let c = 0; c < 5; c++) {
    const pool = Array.from({ length: 15 }, (_, i) => c * 15 + i + 1);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    // Sorted down the column, the way printed cards are.
    cols.push(pool.slice(0, 5).sort((a, b) => a - b));
  }
  cols[2][2] = FREE;
  return [0, 1, 2, 3, 4].map((r) => cols.map((col) => col[r]));
}

// Every way to win, as lists of [row, col].
const R = [0, 1, 2, 3, 4];
const LINES = [
  ...R.map((r) => ({ name: `第${r + 1}行（橫）`, cells: R.map((c) => [r, c]) })),
  ...R.map((c) => ({ name: `${'BINGO'[c]} 行（直）`, cells: R.map((r) => [r, c]) })),
  { name: '斜線 ↘', cells: R.map((i) => [i, i]) },
  { name: '斜線 ↙', cells: R.map((i) => [i, 4 - i]) },
];
const CORNERS = { name: '四角', cells: [[0, 0], [0, 4], [4, 0], [4, 4]] };
const FULL = { name: '全卡', cells: R.flatMap((r) => R.map((c) => [r, c])) };

export const WIN_RULES = {
  line: '一條線',
  corners: '四角',
  two: '兩條線',
  full: '全卡',
};

/**
 * Does this card win under `rule`, given the numbers drawn?
 * → { win, hits: [[r,c]...] that won, marked: bool[5][5], need: fewest still missing, label }
 */
export function checkCard(card, drawn, rule = 'line') {
  const set = new Set(drawn);
  const marked = card.map((row) => row.map((n) => n === FREE || set.has(n)));
  const missing = (p) => p.cells.filter(([r, c]) => !marked[r][c]).length;
  const done = (p) => missing(p) === 0;

  let patterns;
  let enough = 1;
  if (rule === 'corners') patterns = [CORNERS];
  else if (rule === 'full') patterns = [FULL];
  else { patterns = LINES; enough = rule === 'two' ? 2 : 1; }

  const won = patterns.filter(done);
  const win = won.length >= enough;
  const hits = win ? won.flatMap((p) => p.cells) : [];
  // How close: for two lines, the done ones count for nothing missing.
  const gaps = patterns.map(missing).sort((a, b) => a - b);
  const need = gaps.slice(0, enough).reduce((a, b) => a + b, 0);
  return { win, hits, marked, need, label: won.map((p) => p.name).join('、') };
}
