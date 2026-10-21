/**
 * 譚仔揼波拿 — the host's console.
 *
 * The players hold paper cards; this page is the cage, the caller and the
 * board. Space draws a ball, the callers say it in Cantonese, the board
 * lights it up. A claimed Bingo is checked by reading the card's numbers in.
 */

import {
  CAST, QUIPS, HELPER_DRAW, BANTER, OPENING, MILESTONE, CLAIM, CLAIM_GOOD, CLAIM_BAD, RESUME,
  callLine, cantonese, letterFor, pick, spelt,
} from './calls.js';
import { Voice } from './voice.js';
import { createShow } from './show.js';
import { createSfx } from './sfx.js';
import { FREE, WIN_RULES, checkCard, formatId, makeCard, parseId } from './cards.js';
import { icons, iconUrl } from './icons.js';

const $ = (id) => document.getElementById(id);
const STORE = 'tcbingo.v1';

const DEFAULTS = { stake: 1, mode: 'duo', host: 'lung', helper: 'gaai', fun: '1', pool: '75', letters: true, gap: '6', theme: 'forest', win: 'line', sfx: true, beat: true };

const state = load();
// Each player has an id (so a winner survives others being deleted) and a running total won.
const newId = () => Math.random().toString(36).slice(2, 9);
for (const p of state.players) { p.id ||= newId(); p.won ||= 0; p.paid ||= 0; }
state.winners ||= [];
let busy = false;
let autoOn = false;
let autoTimer = 0;

const sfx = createSfx();

const show = createShow({
  stage: $('stage'), back: $('stageBack'), front: $('stageFront'),
  ballWrap: $('ballWrap'), ball: $('ball'), ids: Object.keys(CAST),
  sound: { pop: sfx.pop, whoosh: sfx.whoosh, rattle: sfx.rattle, firework: sfx.firework },
});

const voice = new Voice({
  onLine: ({ who, text, mood }) => {
    const c = CAST[who];
    const chip = $('speaker');
    chip.textContent = c.name;
    chip.style.background = c.color;
    chip.classList.remove('pop');
    void chip.offsetWidth; // restart the animation
    chip.classList.add('pop');
    typeCaption(text);
    show.talk(who);
    sfx.duck(true);
    if (mood) show.react(mood);
  },
  onLineEnd: () => { show.talk(null); sfx.duck(false); },
});

// The caption types itself out, a few characters a beat, like a ticker.
let typing = 0;
function typeCaption(text) {
  clearInterval(typing);
  const el = $('caption');
  const chars = [...text];
  let i = 0;
  el.textContent = '';
  typing = setInterval(() => {
    i = Math.min(chars.length, i + 2);
    el.textContent = chars.slice(0, i).join('');
    if (i >= chars.length) clearInterval(typing);
  }, 45);
}

function flash(color = '#ffffff') {
  const el = $('flash');
  el.style.background = color;
  el.classList.remove('go');
  void el.offsetWidth;
  el.classList.add('go');
}

function shake() {
  const el = $('stage');
  el.classList.remove('shake');
  void el.offsetWidth;
  el.classList.add('shake');
}

// -------------------------------------------------------------------- state

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE));
    if (saved && Array.isArray(saved.drawn)) {
      return { players: [], ...saved, settings: { ...DEFAULTS, ...saved.settings } };
    }
  } catch { /* a private window: start fresh */ }
  return { game: 1, pool: 75, drawn: [], opened: false, players: [], settings: { ...DEFAULTS } };
}

function save() {
  try { localStorage.setItem(STORE, JSON.stringify(state)); } catch { /* not kept; the game still runs */ }
}

const remaining = () => {
  const out = [];
  for (let n = 1; n <= state.pool; n++) if (!state.drawn.includes(n)) out.push(n);
  return out;
};

function randomIndex(len) {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] % len;
}

// ------------------------------------------------------------------- render

const LETTER_COLORS = { B: '#1c7fd6', I: '#e02020', N: '#00a852', G: '#e8a400', O: '#7a4fd0' };
const DECADE_COLORS = ['#1c7fd6', '#e02020', '#00a852', '#e8a400', '#7a4fd0', '#d0367a', '#0a8f8f', '#e06a00', '#5a6b7d', '#1a1a1a'];

function ballColor(n) {
  const letter = letterFor(n, state.pool);
  return letter ? LETTER_COLORS[letter] : DECADE_COLORS[Math.floor((n - 1) / 10) % 10];
}

function showBall(n) {
  const ball = $('ball');
  if (!n) {
    ball.style.setProperty('--ball', 'var(--accent)');
    $('ballLetter').textContent = '';
    $('ballNum').textContent = '?';
    return;
  }
  ball.style.setProperty('--ball', ballColor(n));
  $('ballLetter').textContent = letterFor(n, state.pool);
  $('ballNum').textContent = n;
}

function renderBoard() {
  const board = $('board');
  const pool = state.pool;
  const last = state.drawn[state.drawn.length - 1];
  board.className = `board board-${pool}`;
  const cells = [];
  if (pool === 75) {
    for (let row = 0; row < 5; row++) {
      const letter = 'BINGO'[row];
      cells.push(`<span class="cell head" style="--ball:${LETTER_COLORS[letter]}">${letter}</span>`);
      for (let i = 1; i <= 15; i++) cells.push(cell(row * 15 + i, last));
    }
  } else {
    for (let n = 1; n <= pool; n++) cells.push(cell(n, last));
  }
  board.innerHTML = cells.join('');
  $('boardNote').textContent = `已抽 ${state.drawn.length} / ${pool}`;
}

function cell(n, last) {
  const on = state.drawn.includes(n);
  const cls = ['cell', on && 'on', n === last && 'last'].filter(Boolean).join(' ');
  return `<span class="${cls}" style="--ball:${ballColor(n)}">${n}</span>`;
}

function renderRecent() {
  const prev = state.drawn.slice(-7, -1).reverse();
  $('recent').innerHTML = prev
    .map((n) => `<span class="mini" style="--ball:${ballColor(n)}"><b>${letterFor(n, state.pool)}</b>${n}</span>`)
    .join('');
}

function renderStatus() {
  const d = state.drawn.length;
  $('countPill').textContent = state.opened ? `已抽 ${d} · 剩 ${state.pool - d}` : '未開波';
  // The pixel font's 7 reads as a 1 at this size, so the number is in the plain face.
  $('stageGame').innerHTML = `第 <b>${state.game}</b> 局`;
  $('drawBtn').textContent = !state.opened ? '開波' : d >= state.pool ? '全部抽晒' : '抽號';
  $('drawBtn').disabled = busy || (state.opened && d >= state.pool);
  $('undoBtn').disabled = busy || !d;
  $('repeatBtn').disabled = busy || !d;
  $('autoBtn').setAttribute('aria-pressed', String(autoOn));
  $('autoBtn').textContent = autoOn ? '暫停 ❚❚' : '自動抽 ▶';
}

function renderAll() {
  showBall(state.drawn[state.drawn.length - 1]);
  renderBoard();
  renderRecent();
  renderStatus();
  // The further in, the tenser: Bingo usually comes before 60% of the balls are out.
  const d = state.drawn.length;
  sfx.setTension(state.opened ? Math.min(1, d / (state.pool * 0.6)) : 0);
  show.setLeft(1 - d / state.pool);
}

// --------------------------------------------------------------------- sound

// A browser lets a page make sound only after a tap or a key.
for (const ev of ['pointerdown', 'keydown']) addEventListener(ev, () => sfx.unlock(), { capture: true });

// -------------------------------------------------------------------- the game

function speaker(kind) {
  const s = state.settings;
  const all = Object.keys(CAST);
  if (s.mode === 'rotate') return all[(state.drawn.length - 1 + all.length) % all.length];
  if (s.mode === 'random') return pick(all);
  return kind === 'helper' ? s.helper : s.host;
}

async function open() {
  busy = true;
  state.opened = true;
  chargeAll();
  save();
  renderPlayers();
  save();
  renderStatus();
  const s = state.settings;
  show.react('wave');
  await voice.say([
    { who: s.host, text: pick(OPENING) },
    { who: s.helper, text: '我係助手，負責抽波！大家準備好未？' },
  ]);
  busy = false;
  renderStatus();
  warmUp();
}

async function draw() {
  if (busy) return;
  if (!state.opened) return open();
  const left = remaining();
  if (!left.length) return;
  clearTimeout(autoTimer); // drawn by hand mid-countdown: start the wait again after this one
  hideCountdown();

  busy = true;
  const n = left[randomIndex(left.length)];
  state.drawn.push(n);
  save();
  renderStatus();

  const s = state.settings;
  const fun = Number(s.fun);
  const caller = speaker('host');
  const lines = [];
  if (s.mode === 'duo') lines.push({ who: s.helper, text: pick(HELPER_DRAW) });

  // The cage turns until the number is about to be said, and at least this
  // long — time for the rabbit to get to the handle. Then the rabbit pulls
  // the ball and throws it; it lands, and only then is the number shown.
  const spinUntil = Date.now() + 1400;
  const stopSpin = spin();
  const color = ballColor(n);
  lines.push({
    who: caller,
    text: callLine(n, { pool: state.pool, letters: s.letters }),
    before: async () => {
      const wait = spinUntil - Date.now();
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      await show.deliver(color);
      stopSpin();
      reveal();
    },
  });

  const quip = QUIPS[n];
  if (quip && fun > 0 && (fun === 2 || Math.random() < 0.6)) lines.push({ who: caller, text: quip, mood: 'laugh' });

  const count = state.drawn.length;
  if (count % 10 === 0 && count < state.pool) {
    lines.push({ who: s.host, text: MILESTONE(count, state.pool - count), mood: 'milestone' });
  } else if (fun > 0 && Math.random() < (fun === 2 ? 0.3 : 0.12)) {
    lines.push({ who: s.mode === 'duo' ? pick([s.host, s.helper]) : caller, text: pick(BANTER), mood: 'chat' });
  }
  if (count === state.pool) lines.push({ who: s.host, text: '全部號碼抽晒喇！仲未有人 Bingo？唔係掛？', mood: 'milestone' });

  await voice.say(lines);
  // Should the voice have been hushed mid-call, the ball still lands.
  stopSpin();
  reveal();
  busy = false;
  renderStatus();
  if (autoOn) scheduleAuto();
}

let spinning = 0;
function spin() {
  const ball = $('ball');
  ball.dataset.state = 'spin';
  $('stage').classList.add('spinning');
  show.react('spin');
  clearInterval(spinning);
  spinning = setInterval(() => {
    const n = 1 + randomIndex(state.pool);
    showBall(n);
  }, 80);
  sfx.startRoll();
  return () => clearInterval(spinning);
}

function reveal() {
  const ball = $('ball');
  if (ball.dataset.state !== 'spin') return;
  ball.dataset.state = 'pop';
  $('stage').classList.remove('spinning');
  const n = state.drawn[state.drawn.length - 1];
  sfx.land();
  renderAll();
  if (n) { show.react('reveal', { color: ballColor(n) }); flash(ballColor(n)); }
  setTimeout(() => { if (ball.dataset.state === 'pop') ball.dataset.state = 'idle'; }, 700);
}

async function repeat() {
  const n = state.drawn[state.drawn.length - 1];
  if (!n || busy) return;
  busy = true;
  renderStatus();
  const text = callLine(n, { pool: state.pool, letters: state.settings.letters });
  await voice.say([{ who: state.settings.host, text: `再講一次：${text}` }]);
  busy = false;
  renderStatus();
}

function undo() {
  if (!state.drawn.length) return;
  const n = state.drawn.pop();
  voice.hush();
  busy = false;
  save();
  $('stage').classList.remove('spinning');
  $('ball').dataset.state = 'idle';
  renderAll();
  show.react('idle');
  show.react('oops');
  $('caption').textContent = `撤回咗 ${n} 號。`;
}

function newGame() {
  if (state.drawn.length && !confirm('開新一局？今局抽過嘅號碼會清晒。')) return;
  stopAuto();
  voice.hush();
  busy = false;
  state.game += 1;
  state.drawn = [];
  state.opened = false;
  state.winners = [];
  state.charged = false;
  state.pool = Number(state.settings.pool);
  save();
  renderAll();
  renderPlayers();
  show.react('idle');
  show.react('wave');
  $('caption').textContent = '新一局！撳「開波」開始。';
}

/** Back to the start of the night: game 1, nothing drawn, nobody up or down. */
function resetAll() {
  const dropPlayers = $('resetPlayers').checked;
  $('resetDialog').close();
  closeLeaderboard();
  stopAuto();
  voice.hush();
  sfx.stopRoll();
  busy = false;
  Object.assign(state, {
    game: 1, drawn: [], opened: false, pool: Number(state.settings.pool),
    pot: 0, charged: false, winners: [], nightGames: 0,
  });
  if (dropPlayers) state.players = [];
  for (const p of state.players) { p.won = 0; p.paid = 0; p.wins = 0; }
  save();
  renderAll();
  renderPlayers();
  show.react('idle');
  show.react('wave');
  $('caption').textContent = '全部重設好！撳「開波」開始第一局。';
}

// ---------------------------------------------------------------------- auto

function scheduleAuto() {
  clearTimeout(autoTimer);
  const ms = Number(state.settings.gap) * 1000;
  autoTimer = setTimeout(() => { hideCountdown(); if (autoOn) draw(); }, ms);
  startCountdown(ms);
}

// The countdown on the stage while auto waits: a ring running down, ticking
// for the last three seconds.
let cdTimer = 0;
function startCountdown(ms) {
  clearInterval(cdTimer);
  const end = Date.now() + ms;
  const el = $('countdown');
  let lastSec = null;
  el.hidden = false;
  const frame = () => {
    const left = Math.max(0, end - Date.now());
    const sec = Math.ceil(left / 1000);
    el.style.setProperty('--p', String(left / ms));
    el.classList.toggle('urgent', sec <= 3);
    if (sec !== lastSec) {
      $('cdNum').textContent = sec;
      if (lastSec !== null && sec <= 3 && sec > 0) sfx.tick(sec === 1);
      lastSec = sec;
    }
    if (!left) clearInterval(cdTimer);
  };
  frame();
  cdTimer = setInterval(frame, 50);
}

function hideCountdown() {
  clearInterval(cdTimer);
  $('countdown').hidden = true;
}

function toggleAuto() {
  autoOn = !autoOn;
  if (autoOn) { if (!busy) draw(); } else { clearTimeout(autoTimer); hideCountdown(); }
  renderStatus();
}

function stopAuto() {
  autoOn = false;
  clearTimeout(autoTimer);
  hideCountdown();
  renderStatus();
}

// -------------------------------------------------------------------- bingo!

// The card being checked, if one was found by its ID: verdict() names it.
let claimed = null;

function claim() {
  stopAuto();
  voice.hush();
  busy = false;
  renderStatus();
  sfx.alarm();
  sfx.duck(true);
  show.react('claim');
  shake();
  flash('#e02020');
  voice.say([{ who: state.settings.host, text: pick(CLAIM) }]);
  claimed = null;
  $('cardInput').value = '';
  $('checkInput').value = '';
  $('checkCard').innerHTML = '';
  $('checkResult').innerHTML = '';
  $('checkManual').open = false;
  $('checkRule').textContent = `贏法：${WIN_RULES[state.settings.win]}`;
  renderWinnerPick();
  $('checkDialog').showModal();
  $('cardInput').focus();
}

// Who won: any number of players, ticked in the check dialog. The pot is split between them.
const picked = new Set();

function renderWinnerPick() {
  picked.clear();
  $('checkWinners').hidden = !state.players.length;
  $('winnerPick').replaceChildren(...state.players.map((p) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'winner-btn';
    b.setAttribute('aria-pressed', 'false');
    const img = new Image();
    img.src = iconUrl(p.icon);
    img.alt = '';
    b.append(img, p.name);
    b.addEventListener('click', () => {
      if (picked.has(p.id)) picked.delete(p.id); else picked.add(p.id);
      b.setAttribute('aria-pressed', String(picked.has(p.id)));
      splitNote();
    });
    return b;
  }));
  splitNote();
}

const share = (pot, n) => Math.floor((pot / n) * 100) / 100;

function splitNote() {
  const pot = prize();
  const n = picked.size;
  $('splitNote').textContent = !n || !pot ? '' : n === 1 ? `贏 ${money(pot)}` : `${money(pot)} ÷ ${n} = 每人 ${money(share(pot, n))}`;
}

/** By card ID: rebuild the card, mark what has been drawn, say whether it wins. */
function checkById() {
  const raw = $('cardInput').value.trim();
  claimed = null;
  if (!raw) { $('checkCard').innerHTML = ''; $('checkResult').innerHTML = ''; return; }
  const id = parseId(raw);
  if (!id) {
    $('checkCard').innerHTML = '';
    $('checkResult').innerHTML = '<p class="verdict miss">卡號要係 1 – 9999。</p>';
    return;
  }
  if (state.pool !== 75) {
    $('checkResult').innerHTML = '<p class="verdict miss">印出嚟嘅卡係 1–75 嘅；呢局用緊 1–90，對唔到。</p>';
    return;
  }
  const card = makeCard(id);
  const result = checkCard(card, state.drawn, state.settings.win);
  const hit = new Set(result.hits.map(([r, c]) => `${r},${c}`));
  const rows = card.map((row, r) => `<tr>${row.map((n, c) => {
    const cls = [result.marked[r][c] && 'on', hit.has(`${r},${c}`) && 'hit', n === FREE && 'free'].filter(Boolean).join(' ');
    return `<td class="${cls}">${n === FREE ? '★' : n}</td>`;
  }).join('')}</tr>`).join('');
  $('checkCard').innerHTML = `
    <table class="mini-card">
      <caption>No. ${formatId(id)}</caption>
      <thead><tr>${[...'BINGO'].map((l) => `<th>${l}</th>`).join('')}</tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
  claimed = { id, win: result.win, label: result.label };
  $('checkResult').innerHTML = result.win
    ? `<p class="verdict ok">✓ Bingo！${result.label}</p>`
    : `<p class="verdict miss">✗ 未得：${WIN_RULES[state.settings.win]}仲差 ${result.need} 個</p>`;
}

/** Without an ID: the numbers read off the card, one by one. */
function checkNumbers() {
  claimed = null;
  $('cardInput').value = '';
  $('checkCard').innerHTML = '';
  const nums = [...new Set(($('checkInput').value.match(/\d+/g) || []).map(Number))]
    .filter((n) => n >= 1 && n <= state.pool);
  if (!nums.length) { $('checkResult').innerHTML = ''; return; }
  const missing = nums.filter((n) => !state.drawn.includes(n));
  const chips = nums
    .map((n) => `<span class="chip ${state.drawn.includes(n) ? 'ok' : 'miss'}">${n}</span>`)
    .join('');
  const verdict = missing.length
    ? `<p class="verdict miss">有 ${missing.length} 個未抽到：${missing.join('、')}</p>`
    : `<p class="verdict ok">${nums.length} 個號碼全部抽咗 ✓</p>`;
  $('checkResult').innerHTML = `<div class="chips">${chips}</div>${verdict}`;
}

// 恭喜阿明同小美！每人分到六蚊！
function winnerLine(winners, pot, each) {
  if (!winners.length) return pot ? `恭喜你！今局獎金${prizeWords(pot)}，記得出嚟攞錢呀！` : '恭喜你！記得出嚟攞獎呀！';
  const names = winners.map((p) => p.name);
  const who = names.length > 1 ? `${names.slice(0, -1).join('、')}同${names[names.length - 1]}` : names[0];
  if (!each) return `恭喜${who}！`;
  return winners.length > 1 ? `恭喜${who}！獎金平分，每人${prizeWords(each)}！` : `恭喜${who}！贏咗${prizeWords(each)}！`;
}

async function verdict(good) {
  $('checkDialog').close();
  const s = state.settings;
  // Card 1234 is 一二三四, the way you'd read it off the paper.
  const card = claimed ? `${claimed.id < 100 ? cantonese(claimed.id) : spelt(claimed.id)}號卡，` : '';
  if (good) {
    confetti();
    sfx.fanfare();
    show.react('win');
    flash('#ffd200');
    chargeAll(); // a Bingo before 開波 still plays for the pot
    const pot = prize();
    const winners = state.players.filter((p) => picked.has(p.id));
    const each = winners.length ? share(pot, winners.length) : 0;
    if (pot) {
      $('prize').classList.add('won');
      setTimeout(() => { $('prize').classList.remove('won'); renderPrize(); }, 9000);
    }
    if (winners.length) {
      for (const p of winners) { p.won = round2((p.won || 0) + each); p.wins = (p.wins || 0) + 1; gains.set(p.id, each); }
      // Paid out; any odd cents from the split stay in for next time.
      state.pot = round2(pot - each * winners.length);
      state.winners = winners.map((p) => p.id);
    }
    save();
    renderPlayers();
    await voice.say([
      { who: s.host, text: card + pick(CLAIM_GOOD) },
      { who: s.helper, text: winnerLine(winners, pot, each) },
    ]);
  } else {
    show.react('lose');
    sfx.womp();
    await voice.say([
      { who: s.host, text: card + pick(CLAIM_BAD) },
      { who: s.helper, text: RESUME },
    ]);
  }
}

// ------------------------------------------------------------------- players

// The pot: every player puts the stake in for each game.
const money = (n) => `$${Number.isInteger(n) ? n : n.toFixed(2).replace(/0$/, '')}`;
const signed = (n) => (n > 0 ? `+${money(n)}` : n < 0 ? `−${money(-n)}` : '$0');
const round2 = (n) => Math.round(n * 100) / 100;
const stake = () => Math.max(0, Number(state.settings.stake) || 0);
const profit = (p) => round2((p.won || 0) - (p.paid || 0));
// Once a game is open its pot is what was put in; before that, what will be.
const prize = () => (state.charged ? state.pot : round2(state.pot + stake() * state.players.length));
// Said aloud: 六蚊, 十二蚊; anything with cents, as written.
const prizeWords = (n) => (Number.isInteger(n) && n < 100 ? `${cantonese(n)}蚊` : `${n}蚊`);

// Everyone in pays the stake for this game.
function charge(p) {
  const s = stake();
  p.paid = round2((p.paid || 0) + s);
  state.pot = round2(state.pot + s);
}
function chargeAll() {
  if (state.charged) return;
  for (const p of state.players) charge(p);
  state.charged = true;
  state.nightGames = (state.nightGames || 0) + 1;
}

let shownPrize = null;
function renderPrize() {
  const p = prize();
  const el = $('prize');
  if (el.classList.contains('won')) return; // the pot just paid out: keep it up while they celebrate
  el.hidden = !p;
  $('prizeAmt').textContent = money(p);
  const carried = !state.charged && state.pot > 0 ? `（連上局滾存 ${money(state.pot)}）` : '';
  $('stakeTotal').textContent = !state.players.length ? ''
    : state.charged ? `今局獎金 ${money(p)}（改注金下局先生效）`
    : `× ${state.players.length} 人 = 今局獎金 ${money(p)}${carried}`;
  if (p && shownPrize !== null && p !== shownPrize) {
    el.classList.remove('pop');
    void el.offsetWidth;
    el.classList.add('pop');
  }
  shownPrize = p;
}

// Players: a name and a pixel icon each. They stay from one game to the next.
let pickedIcon = null;
let newest = -1;
const gains = new Map(); // id → what they just won, shown once as a '+$6' rising off the chip

function renderPlayers() {
  const players = state.players;
  const strip = $('players');
  const track = $('playersTrack');
  strip.hidden = !players.length;
  strip.style.setProperty('--crown', `url(${iconUrl('crown')})`);
  strip.classList.remove('scroll');
  // Whoever has won the most wears the crown; this game's winners light up.
  const top = Math.max(...players.map(profit));
  const anyWins = players.some((p) => p.won > 0);
  const winners = new Set(state.winners);
  const chip = (p, i) => {
    const el = document.createElement('span');
    el.className = ['player-chip', i === newest && 'new', winners.has(p.id) && 'winner', anyWins && profit(p) === top && 'leader']
      .filter(Boolean).join(' ');
    const img = new Image();
    img.src = iconUrl(p.icon);
    img.alt = '';
    el.append(img, profitTag(p), p.name);
    if (gains.has(p.id) && i >= 0) {
      const g = document.createElement('i');
      g.className = 'player-gain';
      g.textContent = `+${money(gains.get(p.id))}`;
      el.append(g);
    }
    return el;
  };
  track.replaceChildren(...players.map(chip));
  newest = -1;
  gains.clear();
  // More than fit: run them past twice over, so the loop has no seam.
  requestAnimationFrame(() => {
    if (strip.hidden || track.scrollWidth <= strip.clientWidth) return;
    track.append(...players.map((p) => chip(p, -1)));
    strip.style.setProperty('--ticker', `${Math.max(12, players.length * 2.5)}s`);
    strip.classList.add('scroll');
  });

  $('playersBtn').textContent = players.length ? `玩家名單（${players.length} 人 · ${money(prize())}）` : '玩家名單';
  renderPrize();
  $('boardBtn').hidden = !players.length;
  $('playersCount').textContent = players.length ? `${players.length} 人` : '';
  $('playerList').replaceChildren(...players.map((p, i) => {
    const li = document.createElement('li');
    const img = new Image();
    img.src = iconUrl(p.icon);
    img.alt = '';
    const name = document.createElement('span');
    name.textContent = p.name;
    const won = profitTag(p);
    won.title = `贏 ${money(p.won || 0)} · 落注 ${money(p.paid || 0)}`;
    const detail = document.createElement('small');
    detail.className = 'player-ledger';
    detail.textContent = won.title;
    name.append(detail);
    const del = document.createElement('button');
    del.type = 'button';
    del.textContent = '✕';
    del.title = `刪除 ${p.name}`;
    del.addEventListener('click', () => { state.players.splice(i, 1); newest = -1; save(); renderPlayers(); });
    li.append(img, name, won, del);
    return li;
  }));
}

// The next icon offered: one nobody has yet, if there is one.
// Up or down after stakes: +$12 in gold, −$3 in red.
function profitTag(p) {
  const n = profit(p);
  const b = document.createElement('b');
  b.className = `player-won${n < 0 ? ' down' : ''}`;
  b.textContent = signed(n);
  return b;
}

function freshIcon() {
  const used = new Set(state.players.map((p) => p.icon));
  const free = icons().filter((i) => !used.has(i.id));
  const from = free.length ? free : icons();
  return from[randomIndex(from.length)].id;
}

function pickIcon(id) {
  pickedIcon = id;
  $('playerPick').src = iconUrl(id);
  for (const b of $('iconGrid').children) b.setAttribute('aria-checked', String(b.dataset.icon === id));
}

function openPlayers() {
  if (!$('iconGrid').children.length) {
    $('iconGrid').replaceChildren(...icons().map((ic) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.icon = ic.id;
      b.title = ic.name;
      b.setAttribute('role', 'radio');
      const img = new Image();
      img.src = ic.url;
      img.alt = ic.name;
      b.append(img);
      b.addEventListener('click', () => { pickIcon(ic.id); $('playerName').focus(); });
      return b;
    }));
  }
  pickIcon(freshIcon());
  $('stakeInput').value = stake();
  $('playersDialog').showModal();
  $('playerName').focus();
}

function addPlayer() {
  const name = $('playerName').value.trim();
  if (!name) { $('playerName').focus(); return; }
  const p = { id: newId(), name, icon: pickedIcon || freshIcon(), won: 0, paid: 0 };
  state.players.push(p);
  if (state.charged) charge(p); // joining a game already going: in for this one too
  newest = state.players.length - 1;
  save();
  renderPlayers();
  $('playerName').value = '';
  $('playerName').focus();
  pickIcon(freshIcon());
  $('playerList').lastElementChild?.scrollIntoView({ block: 'nearest' });
}

// ---------------------------------------------------------------- leaderboard

// The end of the night: everyone ranked by profit, revealed from the bottom
// up, then a drumroll for the top.
let boardRun = 0;
const nap = (ms) => new Promise((r) => setTimeout(r, ms));

function rankPlayers() {
  const rows = state.players
    .map((p) => ({ p, profit: profit(p), wins: p.wins || 0 }))
    .sort((a, b) => b.profit - a.profit || b.wins - a.wins);
  // Level on profit and wins: level in the table.
  rows.forEach((r, i) => {
    const prev = rows[i - 1];
    r.rank = prev && prev.profit === r.profit && prev.wins === r.wins ? prev.rank : i + 1;
  });
  return rows;
}

// Everyone must be on screen before the reveal starts: more columns for a
// big party, then the text shrinks until the lot fits the picture.
function fitLeaderboard(n) {
  const list = $('lbList');
  const inner = list.parentElement;
  const wide = $('stage').clientWidth > 700;
  const cols = !wide ? 1 : n > 14 ? 3 : n > 5 ? 2 : 1;
  list.classList.toggle('cols-2', cols === 2);
  list.classList.toggle('cols-3', cols === 3);
  let fs = Math.max(14, Math.min(30, $('stage').clientWidth / 42));
  list.style.fontSize = `${fs}px`;
  while (inner.scrollHeight > inner.clientHeight + 1 && fs > 9) {
    fs -= 1;
    list.style.fontSize = `${fs}px`;
  }
}

async function showLeaderboard() {
  if (!state.players.length) return;
  stopAuto();
  voice.hush();
  const run = ++boardRun;
  const rows = rankPlayers();
  const games = state.nightGames || 0;
  const paidOut = round2(state.players.reduce((t, p) => t + (p.won || 0), 0));
  $('lbSub').textContent = `玩咗 ${games} 局 · ${rows.length} 位玩家 · 派咗 ${money(paidOut)}`;
  const list = $('lbList');
  list.replaceChildren(...rows.map((r) => {
    const li = document.createElement('li');
    li.className = `lb-row rank-${Math.min(r.rank, 4)}`;
    const rank = document.createElement('span');
    rank.className = 'lb-rank';
    rank.textContent = r.rank;
    const img = new Image();
    img.src = iconUrl(r.p.icon);
    img.alt = '';
    const name = document.createElement('span');
    name.className = 'lb-name';
    name.textContent = r.p.name;
    const sub = document.createElement('small');
    sub.textContent = r.wins ? `贏咗 ${r.wins} 局` : '未贏過';
    name.append(sub);
    const tag = profitTag(r.p);
    tag.classList.add('lb-profit');
    li.append(rank, img, name, tag);
    return li;
  }));
  $('leaderboard').style.setProperty('--crown', `url(${iconUrl('crown')})`);
  $('leaderboard').hidden = false;
  $('stage').classList.add('lb-open');
  fitLeaderboard(rows.length);
  show.react('idle');

  // From last place up, quicker when there are lots; the top spot waits.
  const items = [...list.children];
  const top = rows.filter((r) => r.rank === 1).length;
  const step = Math.max(250, Math.min(700, 5000 / Math.max(1, items.length - top)));
  await nap(700);
  for (let i = items.length - 1; i >= top; i--) {
    if (run !== boardRun) return;
    items[i].classList.add('in');
    sfx.pop();
    await nap(step);
  }
  if (run !== boardRun) return;
  sfx.setTension(1);
  sfx.startRoll();
  show.react('spin');
  await nap(2200);
  if (run !== boardRun) return;
  sfx.land();
  show.react('idle');
  for (let i = 0; i < top; i++) items[i].classList.add('in');
  sfx.fanfare();
  confetti();
  show.react('win');
  flash('#ffd200');
  renderStatus();

  const champs = rows.filter((r) => r.rank === 1);
  const names = champs.map((r) => r.p.name);
  const who = names.length > 1 ? `${names.slice(0, -1).join('、')}同${names[names.length - 1]}` : names[0];
  const best = champs[0].profit;
  const s = state.settings;
  await voice.say([
    { who: s.host, text: `今晚嘅大贏家係……${who}！${best > 0 ? `淨賺${prizeWords(best)}！` : ''}` },
    { who: s.helper, text: '多謝大家今晚嚟玩揼波拿，下次再見！' },
  ]);
}

function closeLeaderboard() {
  if ($('leaderboard').hidden) return;
  boardRun++;
  sfx.stopRoll();
  $('leaderboard').hidden = true;
  $('stage').classList.remove('lb-open');
  show.react('idle');
  renderAll();
}

// ------------------------------------------------------------------ confetti

function confetti() {
  const c = $('confetti');
  const g = c.getContext('2d');
  c.width = innerWidth;
  c.height = innerHeight;
  const colors = ['#ffd200', '#00a852', '#e02020', '#1c7fd6', '#ffffff', '#7a4fd0'];
  const bits = Array.from({ length: 180 }, () => ({
    x: Math.random() * c.width, y: -20 - Math.random() * c.height * 0.5,
    vx: (Math.random() - 0.5) * 3, vy: 2 + Math.random() * 4,
    s: 6 + Math.floor(Math.random() * 3) * 3, color: pick(colors),
  }));
  const end = Date.now() + 4000;
  (function frame() {
    g.clearRect(0, 0, c.width, c.height);
    for (const b of bits) {
      b.x += b.vx; b.y += b.vy; b.vy += 0.03;
      g.fillStyle = b.color;
      g.fillRect(Math.round(b.x), Math.round(b.y), b.s, b.s); // square: pixel confetti
    }
    if (Date.now() < end) requestAnimationFrame(frame);
    else g.clearRect(0, 0, c.width, c.height);
  })();
}

// ------------------------------------------------------------------ warm-up

async function warmUp() {
  const s = state.settings;
  if (s.mode !== 'duo') return; // other modes synthesise on the draw, behind the spin
  const lines = [];
  for (const n of remaining()) {
    lines.push({ who: s.host, text: callLine(n, { pool: state.pool, letters: s.letters }) });
    if (QUIPS[n]) lines.push({ who: s.host, text: QUIPS[n] });
  }
  for (const t of HELPER_DRAW) lines.push({ who: s.helper, text: t });
  const el = $('warm');
  el.hidden = false;
  await voice.warm(lines, (done, total) => { el.textContent = `準備緊聲音… ${done}/${total}`; });
  el.textContent = voice.serverOk ? '聲音準備好 ✓' : '用緊瀏覽器內置聲音';
  setTimeout(() => { el.hidden = true; }, 2500);
}

// ------------------------------------------------------------------ settings

function bindSettings() {
  const castOptions = Object.entries(CAST)
    .map(([id, c]) => `<option value="${id}">${c.name}（${c.role}）</option>`).join('');
  $('optHost').innerHTML = castOptions;
  $('optHelper').innerHTML = castOptions;

  const s = state.settings;
  const fields = { optMode: 'mode', optHost: 'host', optHelper: 'helper', optFun: 'fun', optPool: 'pool', optGap: 'gap', optTheme: 'theme', optWin: 'win' };
  for (const [id, key] of Object.entries(fields)) {
    $(id).value = s[key];
    $(id).addEventListener('change', () => {
      s[key] = $(id).value;
      save();
      applySettings();
      if (key === 'host' || key === 'helper') voice.say([{ who: s[key], text: `我係${CAST[s[key]].name}，由我嚟！` }]);
    });
  }
  for (const [id, key] of [['optLetters', 'letters'], ['optSfx', 'sfx'], ['optBeat', 'beat']]) {
    $(id).checked = s[key];
    $(id).addEventListener('change', () => { s[key] = $(id).checked; save(); applySettings(); });
  }
  applySettings();
}

function applySettings() {
  const s = state.settings;
  document.documentElement.dataset.theme = s.theme;
  show.setHost(s.mode === 'duo' ? s.host : null);
  show.setHelper(s.helper);
  sfx.setEnabled(s.sfx);
  sfx.setHeartbeat(s.beat);
  $('optHelper').closest('label').hidden = s.mode !== 'duo';
  $('optLetters').closest('label').hidden = Number(s.pool) !== 75;
  // A fresh game picks up a new pool straight away; a game in play keeps its own.
  if (!state.drawn.length && !state.opened && state.pool !== Number(s.pool)) {
    state.pool = Number(s.pool);
    save();
    renderAll();
  }
}

// --------------------------------------------------------------------- wiring

$('drawBtn').addEventListener('click', draw);
$('autoBtn').addEventListener('click', toggleAuto);
$('repeatBtn').addEventListener('click', repeat);
$('undoBtn').addEventListener('click', undo);
$('newBtn').addEventListener('click', newGame);
$('resetBtn').addEventListener('click', () => { $('resetPlayers').checked = false; $('resetDialog').showModal(); });
$('resetGo').addEventListener('click', resetAll);
$('bingoBtn').addEventListener('click', claim);
$('checkInput').addEventListener('input', checkNumbers);
$('checkDialog').addEventListener('close', () => sfx.duck(false));
$('cardInput').addEventListener('input', checkById);
$('claimGood').addEventListener('click', () => verdict(true));
$('claimBad').addEventListener('click', () => verdict(false));
$('playersBtn').addEventListener('click', openPlayers);
$('boardBtn').addEventListener('click', showLeaderboard);
$('lbClose').addEventListener('click', closeLeaderboard);
$('players').addEventListener('click', openPlayers);
$('playerAdd').addEventListener('click', addPlayer);
$('stakeInput').addEventListener('input', () => {
  state.settings.stake = Math.max(0, Number($('stakeInput').value) || 0);
  save();
  renderPlayers();
});
$('playerName').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); addPlayer(); }
});
$('winningsClear').addEventListener('click', () => {
  if (!state.players.some((p) => p.won || p.paid) || !confirm('全部玩家嘅輸贏同滾存獎金清零？')) return;
  for (const p of state.players) { p.won = 0; p.paid = 0; p.wins = 0; }
  state.pot = 0;
  state.nightGames = 0;
  state.winners = [];
  if (state.charged) { state.charged = false; chargeAll(); } // this game's stakes, from a clean slate
  save();
  renderPlayers();
});
$('playersClear').addEventListener('click', () => {
  if (!state.players.length || !confirm('清除全部玩家？')) return;
  state.players = [];
  save();
  renderPlayers();
});
new ResizeObserver(() => renderPlayers()).observe($('stage'));
$('fullBtn').addEventListener('click', () => {
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen?.();
});

document.addEventListener('keydown', (e) => {
  if (e.target.closest('input, select, textarea, dialog') || e.metaKey || e.ctrlKey || e.altKey) return;
  const key = e.key.toLowerCase();
  if (key === 'escape') return closeLeaderboard();
  if (key === 'l') return $('leaderboard').hidden ? showLeaderboard() : closeLeaderboard();
  if (!$('leaderboard').hidden) return;
  if (e.code === 'Space' || key === 'enter') { e.preventDefault(); draw(); }
  else if (key === 'a') toggleAuto();
  else if (key === 'r') repeat();
  else if (key === 'b') claim();
});

// The pot: stakes go in when a game opens; a pot nobody wins carries over.
if (state.pot === undefined) {
  state.pot = 0;
  state.charged = false;
  if (state.opened) chargeAll();
  save();
}

bindSettings();
renderAll();
renderPlayers();
if (state.drawn.length) $('caption').textContent = `上次抽到 ${cantonese(state.drawn[state.drawn.length - 1])} 號，撳「抽號」繼續。`;
