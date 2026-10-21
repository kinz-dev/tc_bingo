/**
 * 舞台 — everything that moves on the stage, drawn on two pixel canvases:
 * one behind the ball (spotlights, bulbs, fireworks, the callers walking
 * behind it) and one in front (the callers walking in front, sparks, emotes).
 *
 * The callers walk round the ball on an oval like a revolving stage. Whoever
 * is speaking steps out to the front with a microphone; the rest react to
 * what the game does — spin, reveal, a joke, a Bingo claim, a win.
 *
 * The helper (the rabbit, unless the host picks someone else) works the
 * cage: walks over when a draw starts, turns the handle, takes the ball from
 * the chute, holds it up and throws it onto the big ball (`deliver`).
 *
 * The page tells it what happened (`react`) and who is talking (`talk`);
 * nothing here knows the rules of the game.
 */

import { drawCreature, rect, pixelText, textWidth, HEAD_TOP, speciesOf, shade, DANCES, BEAT } from './sprites.js';

const FIGURE_H = 38; // head top to shoe bottom
const TAU = Math.PI * 2;

export function createShow({ stage, back, front, ballWrap, ball, ids, sound = {} }) {
  const gb = back.getContext('2d');
  const gf = front.getContext('2d');
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let scale = 3;
  let W = 300;
  let H = 170;
  let geo = { cx: 150, cy: 80, R: 40, rx: 70, ry: 8, baseY: 120 };
  let cage = { x: 30, y: 100, r: 18, floor: 130, spotX: 60 };

  const actors = ids.map((id, i) => ({
    id, slot: i, x: 0, y: 0, z: 0, vz: 0, f: 0, step: Math.random(),
    emote: null, emotion: 'neutral', emotionUntil: 0, action: null, actionUntil: 0,
    blinkAt: 2000 + Math.random() * 3000, nextHop: 3000 + Math.random() * 6000,
  }));

  let angle = 0;
  let talking = null;
  let host = ids[0];
  let helper = ids[1];
  let cageWork = 0;      // until when the helper stays at the cage
  let cageAngle = 0;
  let tumble = 0;        // 0: balls lying at the bottom, 1: flying round
  let left = 1;          // share of the balls still in the cage
  let carry = null;      // the ball on its way from the chute to the big ball
  // Balls in the cage: where each lies at rest, and its own path when tumbling.
  const cageBalls = Array.from({ length: 14 }, (_, i) => ({
    rest: [((i % 5) - 2) * 0.32 + (Math.floor(i / 5) % 2) * 0.16, 0.62 - Math.floor(i / 5) * 0.24],
    r: 0.25 + ((i * 37) % 60) / 100, phase: (i * 2.39) % TAU, speed: 0.7 + ((i * 53) % 50) / 100,
    color: ['#1c7fd6', '#e02020', '#00a852', '#e8a400', '#7a4fd0'][i % 5],
  }));
  let mood = 'idle';
  let moodUntil = 0;
  let accent = '#ffd200';
  const sparks = [];   // in front: bursts, rings, notes
  const behind = [];   // behind: fireworks, balloons
  let lastT = performance.now();
  let fireworkAt = 0;

  // A sky of fixed twinkling stars, so it doesn't crawl.
  const stars = Array.from({ length: 40 }, (_, i) => ({ x: (i * 97) % 997 / 997, y: (i * 61) % 431 / 431 * 0.45, p: (i * 37) % 100 }));

  // ------------------------------------------------------------- geometry

  function layout() {
    const sr = stage.getBoundingClientRect();
    if (!sr.width) return;
    // Two screen pixels per stage pixel: big enough to read as pixel art,
    // small enough that six of them fit round the ball. A wall-sized screen gets three.
    scale = sr.width >= 1200 ? 3 : 2;
    W = Math.ceil(sr.width / scale);
    H = Math.ceil(sr.height / scale);
    for (const c of [back, front]) { c.width = W; c.height = H; }
    gb.imageSmoothingEnabled = gf.imageSmoothingEnabled = false;
    // The wrap is never transformed (the ball wobbles and pops), so measure that.
    const wr = ballWrap.getBoundingClientRect();
    const cx = (wr.left + wr.width / 2 - sr.left) / scale;
    const cy = (wr.top + wr.height / 2 - sr.top) / scale;
    const R = ball.offsetWidth / 2 / scale;
    // Feet on an oval round the bottom of the ball: the ones in front pass
    // under the number, never over it.
    const rx = Math.min(W / 2 - 14, R + 34);
    const ry = Math.max(6, R * 0.2);
    // The front row's heads stay below the number (it fills about the middle 45%).
    // …but the front row's feet stay above the yellow band, however big the ball gets.
    const band = stage.querySelector('.lower-third');
    const floorMax = band ? (band.getBoundingClientRect().top - sr.top) / scale - ry - 3 : Infinity;
    const baseY = Math.min(floorMax, Math.max(cy + R * 0.95, cy + R * 0.48 + FIGURE_H - ry));
    geo = { cx, cy, R, rx, ry, baseY };
    // The cage stands on the floor to the left of the revolving stage, the
    // rabbit's spot just to its right. On a phone it squeezes into the corner.
    const floor = baseY + ry;
    const r = Math.max(11, Math.min(24, R * 0.42));
    const x = Math.max(r + 6, cx - rx - 26 - r);
    cage = { x, y: floor - r - 12, r, floor, spotX: x + r + 15 };
  }

  // The stage, and the ball's own row: that shrinks when the prize band or the
  // players' strip turns up, with the stage the same size as before.
  const ro = new ResizeObserver(layout);
  ro.observe(stage);
  ro.observe(ballWrap);
  layout();

  // ------------------------------------------------------------- the page's calls

  function talk(id) { talking = id; }
  function setHost(id) { host = id; }

  function setMood(m, ms) { mood = m; moodUntil = performance.now() + ms; }

  function emote(a, text, ms = 1600, color = '#1a1a1a') { a.emote = { text, color, until: performance.now() + ms }; }
  function feel(a, emotion, ms) { a.emotion = emotion; a.emotionUntil = performance.now() + ms; }
  function act(a, action, ms) { a.action = action; a.actionUntil = performance.now() + ms; }
  function hop(a, power = 2.6) { if (a.z <= 0.01) a.vz = power * (0.85 + Math.random() * 0.3); }
  const some = (n) => [...actors].sort(() => Math.random() - 0.5).slice(0, n);

  function react(kind, opts = {}) {
    const now = performance.now();
    switch (kind) {
      case 'wave':
        for (const a of actors) { act(a, 'wave', 3200); feel(a, 'happy', 3200); }
        emote(actors.find((a) => a.id === host) || actors[0], 'HI', 2200);
        break;
      case 'spin':
        setMood('spin', 30000);
        cageWork = now + 30000;
        for (const a of actors) { feel(a, 'surprised', 30000); emote(a, '?', 30000); }
        break;
      case 'reveal': {
        setMood('idle', 0);
        accent = opts.color || accent;
        for (const a of actors) {
          a.emote = null;
          feel(a, 'happy', 2500);
          setTimeout(() => hop(a, 3), Math.random() * 250);
        }
        for (const a of some(2)) emote(a, '!', 1200, accent);
        burst(geo.cx, geo.cy, accent, calm ? 12 : 60);
        ring(geo.cx, geo.cy, geo.R, accent);
        ring(geo.cx, geo.cy, geo.R * 0.8, '#ffffff', 200);
        break;
      }
      case 'laugh':
        for (const a of some(3)) { emote(a, 'HA', 1800, '#e02020'); feel(a, 'happy', 2000); hop(a, 2); }
        for (let i = 0; i < 4; i++) note(geo.cx + (Math.random() - 0.5) * geo.rx * 2, geo.baseY - 30, 'HA', '#ffd200');
        break;
      case 'chat':
        for (const a of some(2)) emote(a, '♪', 2200, '#7a4fd0');
        break;
      case 'milestone':
        balloons(calm ? 3 : 14);
        for (const a of actors) { act(a, 'cheer', 2500); hop(a, 2.4); }
        break;
      case 'claim':
        setMood('claim', 3500);
        for (const a of actors) { emote(a, '!', 3500, '#e02020'); feel(a, 'surprised', 3500); hop(a, 3.2); }
        break;
      case 'win':
        setMood('win', 9000);
        for (const a of actors) { act(a, 'dance', 9000); feel(a, 'happy', 9000); emote(a, '♥', 3000, '#e02020'); }
        balloons(calm ? 4 : 18);
        fireworkAt = now;
        break;
      case 'lose':
        setMood('lose', 3500);
        for (const a of actors) { act(a, 'shrug', 3000); feel(a, 'sad', 3500); a.emote = null; }
        for (const a of some(3)) emote(a, '?', 2500);
        break;
      case 'oops':
        for (const a of some(2)) { emote(a, '?', 1500); act(a, 'shrug', 1500); }
        break;
      case 'idle':
        setMood('idle', 0);
        for (const a of actors) { a.emote = null; a.action = null; a.emotion = 'neutral'; }
        break;
    }
  }

  // ------------------------------------------------------------- particles

  const PALETTE = ['#ffd200', '#00a852', '#e02020', '#1c7fd6', '#ffffff', '#7a4fd0', '#ff8fab'];

  function burst(x, y, color, n, list = sparks) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU;
      const v = 0.8 + Math.random() * 2.4;
      list.push({
        kind: i % 4 === 0 ? 'plus' : 'sq', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 0.8,
        g: 0.06, life: 900 + Math.random() * 700, age: 0,
        color: i % 3 === 0 ? '#ffffff' : i % 3 === 1 ? color : PALETTE[i % PALETTE.length],
        size: Math.random() < 0.3 ? 2 : 1,
      });
    }
  }

  function ring(x, y, r, color, delay = 0) {
    sparks.push({ kind: 'ring', x, y, r, color, life: 600, age: -delay });
  }

  function note(x, y, text, color) {
    sparks.push({ kind: 'text', x, y, vx: (Math.random() - 0.5) * 0.3, vy: -0.5, g: 0, text, color, life: 1600, age: 0 });
  }

  function balloons(n) {
    for (let i = 0; i < n; i++) {
      behind.push({
        kind: 'balloon', x: 8 + Math.random() * (W - 16), y: H + 10 + Math.random() * 60,
        vy: -(0.35 + Math.random() * 0.35), phase: Math.random() * TAU,
        color: PALETTE[i % PALETTE.length], life: 14000, age: 0,
      });
    }
  }

  function firework() {
    const x = 20 + Math.random() * (W - 40);
    behind.push({ kind: 'rocket', x, y: H, vx: (Math.random() - 0.5) * 0.4, vy: -(2.6 + Math.random()), g: 0.035, life: 2000, age: 0, color: PALETTE[Math.floor(Math.random() * PALETTE.length)] });
  }

  function stepParticles(list, dt, g) {
    const k = dt / 16.7;
    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i];
      p.age += dt;
      if (p.age > p.life) { list.splice(i, 1); continue; }
      if (p.age < 0) continue;
      if (p.kind === 'balloon') {
        p.y += p.vy * k;
        const sway = Math.sin(p.age / 500 + p.phase) * 3;
        const bx = p.x + sway;
        rect(g, bx - 3, p.y - 4, 7, 8, p.color);
        rect(g, bx - 2, p.y - 5, 5, 1, p.color);
        rect(g, bx - 2, p.y + 4, 5, 1, p.color);
        rect(g, bx - 1, p.y - 3, 2, 2, '#ffffff');
        for (let s = 0; s < 8; s++) rect(g, p.x + Math.sin(p.age / 500 + p.phase - s * 0.2) * 3, p.y + 5 + s, 1, 1, 'rgba(255,255,255,0.6)');
        if (p.y < -20) list.splice(i, 1);
        continue;
      }
      p.vy += (p.g || 0) * k;
      if (p.vx != null) { p.x += p.vx * k; p.y += p.vy * k; }
      const fade = 1 - p.age / p.life;
      g.globalAlpha = Math.max(0, Math.min(1, fade * 1.5));
      if (p.kind === 'rocket') {
        rect(g, p.x, p.y, 1, 3, '#fff2b0');
        if (p.vy > -0.4) { burst(p.x, p.y, p.color, calm ? 10 : 46, list); list.splice(i, 1); sound.firework?.(); }
      } else if (p.kind === 'ring') {
        const r = p.r + (p.age / p.life) * 30;
        g.fillStyle = p.color;
        for (let a = 0; a < TAU; a += 1.2 / r) g.fillRect(Math.round(p.x + Math.cos(a) * r), Math.round(p.y + Math.sin(a) * r), 1, 1);
      } else if (p.kind === 'text') {
        pixelText(g, p.text, p.x - textWidth(p.text) / 2, p.y, 1, p.color);
      } else if (p.kind === 'plus') {
        rect(g, p.x - 1, p.y, 3, 1, p.color); rect(g, p.x, p.y - 1, 1, 3, p.color);
      } else {
        rect(g, p.x, p.y, p.size, p.size, p.color);
      }
      g.globalAlpha = 1;
    }
  }

  // ------------------------------------------------------------- the set

  function drawSet(g, t) {
    const { cx, baseY, rx, ry } = geo;

    // Stars
    for (const s of stars) {
      const on = (Math.floor(t / 400) + s.p) % 7;
      if (on < 2) continue;
      g.fillStyle = on === 6 ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.35)';
      g.fillRect(Math.round(s.x * W), Math.round(8 + s.y * H), 1, 1);
    }

    // Two spotlights from the top corners, sweeping over the ball.
    const sweep = mood === 'spin' ? 260 : mood === 'claim' ? 180 : 1800;
    const beam = mood === 'claim' ? 'rgba(255,60,60,0.13)' : mood === 'win' ? 'rgba(255,230,120,0.14)' : 'rgba(255,240,180,0.07)';
    for (const [sx, dir] of [[0, 1], [W, -1]]) {
      const aim = cx + dir * Math.sin(t / sweep) * W * 0.25;
      g.fillStyle = beam;
      g.beginPath();
      g.moveTo(sx, 0);
      g.lineTo(aim - 22, baseY + ry);
      g.lineTo(aim + 22, baseY + ry);
      g.closePath();
      g.fill();
    }

    // The revolving stage: an oval of light under the oval of feet.
    const pr = rx + 10;
    const pry = ry + 5;
    for (let dy = -pry; dy <= pry; dy++) {
      const half = Math.round(pr * Math.sqrt(1 - (dy * dy) / (pry * pry)));
      g.fillStyle = dy < -pry + 2 ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.22)';
      g.fillRect(Math.round(cx - half), Math.round(baseY + 2 + dy), half * 2, 1);
    }
    // Its rim of bulbs, chasing round.
    const n = 28;
    const chase = Math.floor(t / (mood === 'spin' ? 50 : 160));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      const on = (i + chase) % 4 === 0;
      const col = mood === 'claim' ? (Math.floor(t / 120) % 2 ? '#ff3b3b' : '#5a0a0a') : on ? '#ffd200' : '#5a4a10';
      rect(g, cx + Math.cos(a) * pr - 1, baseY + 2 + Math.sin(a) * pry, 2, 1, col);
    }

    // Marquee bulbs along the top and down the sides.
    const step = 8;
    const speed = mood === 'spin' ? 45 : mood === 'win' ? 70 : 220;
    const tick = Math.floor(t / speed);
    let k = 0;
    const bulb = (x, y) => {
      const lit = (k++ + tick) % 3 === 0;
      const col = mood === 'claim' ? (Math.floor(t / 140) % 2 ? '#ff3b3b' : '#3a0a0a')
        : mood === 'win' ? PALETTE[(k + tick) % PALETTE.length]
          : lit ? '#ffd200' : '#4a3e10';
      rect(g, x, y, 2, 2, col);
      if (lit && mood !== 'claim') { g.fillStyle = 'rgba(255,210,0,0.25)'; g.fillRect(x - 1, y - 1, 4, 4); }
    };
    for (let x = 4; x < W - 4; x += step) bulb(x, 3);
    for (let y = 3 + step; y < H * 0.7; y += step) bulb(W - 6, y);
    for (let y = Math.floor(H * 0.7 / step) * step - step + 3; y > 3; y -= step) bulb(4, y);
  }

  // ------------------------------------------------------------- the callers

  function stepActors(t, dt) {
    const { cx, rx, ry, baseY, R } = geo;
    const speeds = { idle: 0.00016, spin: 0.0011, claim: 0.0008, win: 0.00018, lose: 0.00005 };
    angle += dt * (calm ? speeds.idle * 0.4 : speeds[mood] ?? speeds.idle);
    const n = actors.length;

    for (const a of actors) {
      const th = angle + (a.slot / n) * TAU;
      const ox = cx + Math.cos(th) * rx;
      const oy = baseY + Math.sin(th) * ry;
      // Where they'd rather be than the oval: the helper at the cage while it
      // works, a speaker out front (the host front-left, anyone else front-right).
      let spot = null;
      if (a.id === helper && t < cageWork) spot = [cage.spotX, cage.floor + 1];
      else if (talking === a.id) spot = [cx + (a.id === host ? -1 : 1) * Math.min(rx - 4, R + 22), baseY + ry + 2];
      if (spot) {
        // Fresh off the oval, the spot is simply there; already off it, walk across.
        if (a.f < 0.02) { a.sx = spot[0]; a.sy = spot[1]; }
        const k = Math.min(1, dt / 220);
        a.sx += (spot[0] - a.sx) * k;
        a.sy += (spot[1] - a.sy) * k;
      }
      a.f += ((spot ? 1 : 0) - a.f) * Math.min(1, dt / 260);
      const nx = ox + ((a.sx ?? ox) - ox) * a.f;
      const ny = oy + ((a.sy ?? oy) - oy) * a.f;
      const moved = Math.hypot(nx - a.x, ny - a.y);
      a.walking = moved > 0.05 && a.f < 0.95;
      a.step = (a.step + moved / 10) % 1;
      a.x = nx;
      a.y = ny;
      a.front = Math.sin(th) >= 0 || a.f > 0.5;

      // Jumping: gravity, and whatever makes them hop.
      a.vz -= 0.16 * (dt / 16.7);
      a.z = Math.max(0, a.z + a.vz * (dt / 16.7));
      if (a.z === 0) a.vz = Math.max(0, a.vz);
      if (!calm) {
        if (mood === 'spin' && a.id !== helper && Math.random() < 0.02) hop(a, 2.2);
        // Dancing: each jumps when their own dance says so, on the beat.
        if (a.action === 'dance') {
          const b = Math.floor(t / BEAT);
          if (b !== a.beat) { a.beat = b; const p = (DANCES[a.id] || DANCES.lung).hop(b); if (p) hop(a, p); }
        } else if (mood === 'win' && a.z === 0) hop(a, 2 + ((a.slot + Math.floor(t / 300)) % 2));
        if (mood === 'claim' && Math.random() < 0.03) hop(a, 2.6);
        if (mood === 'idle' && t > a.nextHop) { hop(a, 1.8); a.nextHop = t + 4000 + Math.random() * 9000; }
      }
      // Never jump up in front of the number.
      if (a.front && Math.abs(a.x - cx) < R * 0.8) a.z = Math.min(a.z, 3);

      if (t > a.emotionUntil) a.emotion = talking === a.id ? 'happy' : 'neutral';
      if (t > a.actionUntil) a.action = null;
      if (a.id === helper && mood === 'spin' && !carry && a.f > 0.8) { a.action = 'crank'; a.actionUntil = t + 100; }
      if (a.emote && t > a.emote.until) a.emote = null;
      if (t > a.blinkAt + 140) a.blinkAt = t + 2500 + Math.random() * 3500;
    }
  }

  function drawActor(g, a, t) {
    const feetY = a.y;
    const topY = feetY - FIGURE_H - a.z;
    // The shadow stays on the floor and shrinks as they rise.
    const sw = Math.max(6, 16 - a.z);
    g.fillStyle = 'rgba(0,0,0,0.35)';
    g.fillRect(Math.round(a.x - sw / 2), Math.round(feetY - 1), Math.round(sw), 2);

    const isTalking = talking === a.id;
    // A mouth that opens and shuts like speech: irregular, never a metronome.
    const mouth = isTalking ? [0, 1, 2, 1, 2, 2, 1, 0, 1, 2][Math.floor(t / 90) % 10] : 0;
    drawCreature(g, a.id, a.x, topY, {
      t,
      step: a.step,
      walking: a.walking && a.z === 0,
      airborne: a.z > 1,
      talking: isTalking,
      mouth,
      emotion: a.emotion,
      blink: t > a.blinkAt && t < a.blinkAt + 140,
      action: isTalking && !a.action ? 'mic' : a.action,
      headDy: isTalking ? Math.floor(t / 300) % 2 : 0,
    });

    // Over the head: a speech bubble while talking, else an emote.
    const headTop = topY + (HEAD_TOP[speciesOf(a.id)] || -4);
    if (isTalking) {
      const dots = Math.floor(t / 250) % 4;
      bubble(g, a.x, headTop - 3, 13, '#ffffff', (gx, gy) => {
        for (let i = 0; i < 3; i++) rect(g, gx + 2 + i * 4, gy + 3, 2, 2, i < dots ? '#1a1a1a' : '#c9ccd1');
      });
    } else if (a.emote) {
      const w = textWidth(a.emote.text) + 4;
      const bob = Math.floor(t / 200) % 2;
      bubble(g, a.x, headTop - 3 - bob, w, '#ffffff', (gx, gy) => pixelText(g, a.emote.text, gx + 2, gy + 2, 1, a.emote.color));
    }
  }

  function bubble(g, x, bottom, w, fill, inner) {
    const h = 9;
    const gx = Math.round(x - w / 2);
    const gy = Math.round(bottom - h - 2);
    rect(g, gx + 1, gy, w - 2, h, fill);
    rect(g, gx, gy + 1, w, h - 2, fill);
    rect(g, x - 1, gy + h, 3, 1, fill);
    rect(g, x, gy + h + 1, 1, 1, fill);
    inner(gx, gy);
  }

  // ------------------------------------------------------------- the cage

  function drawCage(g, t, dt) {
    const { x, y, r, floor } = cage;
    const spinning = mood === 'spin';
    cageAngle += dt * (spinning ? 0.011 : 0.0004);
    tumble += ((spinning ? 1 : 0) - tumble) * Math.min(1, dt / 300);
    if (spinning && sound.rattle && Math.random() < dt / 260) sound.rattle();

    // The stand: two legs splayed to the floor, a foot plate, the chute.
    const gold = '#ffd200';
    const brass = '#b38f00';
    for (let i = 0; i <= floor - y; i++) {
      const k = i / (floor - y);
      rect(g, x - r * (0.3 + 0.5 * k) - 1, y + i, 2, 1, brass);
      rect(g, x + r * (0.3 + 0.5 * k) - 1, y + i, 2, 1, brass);
    }
    rect(g, x - r - 3, floor - 1, r * 2 + 6, 2, '#5a4a10');
    rect(g, x + r * 0.35, y + r + 1, r * 0.8, 3, brass); // chute
    rect(g, x + r * 0.35 + r * 0.8 - 1, y + r - 1, 2, 4, brass);

    // The balls, behind the wire.
    const showing = Math.max(2, Math.round(cageBalls.length * left));
    for (let i = 0; i < showing; i++) {
      const b = cageBalls[i];
      const a = cageAngle * b.speed * 3 + b.phase;
      const fx = Math.cos(a) * b.r * 0.85;
      const fy = Math.sin(a) * b.r * 0.85;
      const bx = x + r * (b.rest[0] + (fx - b.rest[0]) * tumble);
      const by = y + r * (b.rest[1] + (fy - b.rest[1]) * tumble);
      rect(g, bx - 1, by - 1, 3, 3, b.color);
      rect(g, bx - 1, by - 1, 1, 1, '#ffffff');
    }

    // The drum: an octagon of wire that turns, its spokes, the hub and handle.
    const sides = 8;
    const pts = [];
    for (let i = 0; i < sides; i++) {
      const a = cageAngle + (i / sides) * TAU;
      pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r]);
    }
    for (let i = 0; i < sides; i++) {
      const [x0, y0] = pts[i];
      const [x1, y1] = pts[(i + 1) % sides];
      line(g, x0, y0, x1, y1, gold);
      if (i % 2 === 0) line(g, x, y, x0, y0, 'rgba(255,210,0,0.35)');
    }
    rect(g, x - 2, y - 2, 4, 4, brass);
    rect(g, x - 1, y - 1, 2, 2, gold);
    // The handle sticks out to the right, where the rabbit stands.
    const ha = cageAngle * 2.4;
    const hx = x + r + 3 + Math.cos(ha) * 3;
    const hy = y + Math.sin(ha) * 3;
    line(g, x, y, x + r + 3, y, brass);
    line(g, x + r + 3, y, hx, hy, brass);
    rect(g, hx - 1, hy - 1, 3, 3, '#e02020');
  }

  function line(g, x0, y0, x1, y1, color) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    g.fillStyle = color;
    for (let i = 0; i <= n; i++) g.fillRect(Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n), 1, 1);
  }

  function disc(g, x, y, r, color) {
    for (let dy = -r; dy <= r; dy++) {
      const half = Math.round(Math.sqrt(r * r - dy * dy));
      rect(g, x - half, y + dy, half * 2 + 1, 1, color);
    }
  }

  /**
   * The rabbit takes a ball from the chute, holds it up, throws it at the big
   * ball. Resolves as it lands, which is when the page shows the number.
   */
  function deliver(color) {
    const a = actors.find((p) => p.id === helper);
    if (!a || calm) return new Promise((r) => setTimeout(r, 150));
    if (carry) carry.resolve();
    return new Promise((resolve) => {
      carry = { color, start: performance.now(), a, resolve, thrown: false };
      sound.pop?.();
    });
  }

  function stepCarry(g, t) {
    if (!carry) return;
    const { a, color } = carry;
    const el = t - carry.start;
    const chute = [cage.x + cage.r * 1.1, cage.y + cage.r + 1];
    const hand = [a.x, a.y - FIGURE_H - a.z - 6];
    const target = [geo.cx, geo.cy];
    const lerp = (p, q, k) => [p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k];
    let pos;
    let r = 2;
    if (el < 260) {
      // Out of the chute and up into the paws.
      const k = el / 260;
      pos = lerp(chute, hand, k);
      pos[1] -= Math.sin(Math.PI * k) * 14;
      act(a, 'hold', 400);
    } else if (el < 640) {
      // Held up for everyone to see.
      pos = [hand[0], hand[1] - (Math.floor(el / 120) % 2)];
      act(a, 'hold', 300);
      r = 3;
      if (Math.random() < 0.3) sparks.push({ kind: 'plus', x: pos[0] + (Math.random() - 0.5) * 10, y: pos[1] + (Math.random() - 0.5) * 10, vx: 0, vy: -0.3, g: 0, life: 400, age: 0, color: '#ffffff' });
    } else if (el < 1080) {
      // Thrown in an arc, growing as it comes at the camera.
      if (!carry.thrown) { carry.thrown = true; sound.whoosh?.(); act(a, 'throw', 600); feel(a, 'happy', 1500); }
      const k = (el - 640) / 440;
      const e = k * k * (3 - 2 * k);
      pos = lerp(hand, target, e);
      pos[1] -= Math.sin(Math.PI * k) * 30;
      r = Math.round(3 + e * geo.R * 0.35);
      sparks.push({ kind: 'sq', x: pos[0], y: pos[1], vx: 0, vy: 0, g: 0, life: 300, age: 0, color, size: 2 });
    } else {
      const done = carry.resolve;
      carry = null;
      cageWork = t + 1400; // a moment at the cage, then back on the stage
      done();
      return;
    }
    disc(g, pos[0], pos[1], r, color);
    if (r >= 3) disc(g, pos[0], pos[1], Math.max(1, Math.round(r * 0.55)), '#ffffff');
    rect(g, pos[0] - r * 0.5, pos[1] - r * 0.6, Math.max(1, r * 0.3), Math.max(1, r * 0.3), 'rgba(255,255,255,0.8)');
  }

  // ------------------------------------------------------------- the loop

  function frame(t) {
    const dt = Math.min(50, t - lastT);
    lastT = t;
    if (mood !== 'idle' && t > moodUntil) mood = 'idle';
    if (mood === 'win' && !calm && t > fireworkAt) { firework(); fireworkAt = t + 280 + Math.random() * 300; }

    gb.clearRect(0, 0, W, H);
    gf.clearRect(0, 0, W, H);
    drawSet(gb, t);
    stepParticles(behind, dt, gb);
    drawCage(gb, t, dt);

    stepActors(t, dt);
    const order = [...actors].sort((p, q) => p.y - q.y);
    for (const a of order) drawActor(a.front ? gf : gb, a, t);

    stepParticles(sparks, dt, gf);
    stepCarry(gf, t);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  return {
    talk, setHost, react, layout, deliver,
    setHelper(id) { helper = id; },
    /** Share of the balls still in the cage, 0..1: the cage empties as the game goes on. */
    setLeft(v) { left = v; },
  };
}
