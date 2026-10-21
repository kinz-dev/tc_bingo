/**
 * 像素角色 — the six callers as little creatures, drawn one rectangle at a
 * time the way 譚仔新聞's studio draws its anchors (studio.js there): the
 * heads are the same species, the bodies are new because these ones stand,
 * walk, jump and wave instead of sitting at a desk.
 *
 * Coordinates: `x` is the centre, `y` the top of the head; a figure is about
 * 40 pixels from the top of its head to its shoes.
 */

export function rect(g, x, y, w, h, color) {
  g.fillStyle = color;
  g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

export function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.max(0, Math.min(255, Math.round(v + amt)));
  return `#${((f(n >> 16) << 16) | (f((n >> 8) & 255) << 8) | f(n & 255)).toString(16).padStart(6, '0')}`;
}

// A 3×5 font for the emotes over their heads: ! ? HA ♪ and digits.
const GLYPHS = {
  0: ['111', '101', '101', '101', '111'], 1: ['010', '110', '010', '010', '111'],
  2: ['111', '001', '111', '100', '111'], 3: ['111', '001', '111', '001', '111'],
  4: ['101', '101', '111', '001', '001'], 5: ['111', '100', '111', '001', '111'],
  6: ['111', '100', '111', '101', '111'], 7: ['111', '001', '010', '010', '010'],
  8: ['111', '101', '111', '101', '111'], 9: ['111', '101', '111', '001', '111'],
  A: ['010', '101', '111', '101', '101'], B: ['110', '101', '110', '101', '110'],
  G: ['111', '100', '101', '101', '111'], H: ['101', '101', '111', '101', '101'],
  I: ['111', '010', '010', '010', '111'], N: ['1001', '1101', '1011', '1001', '1001'],
  O: ['111', '101', '101', '101', '111'], W: ['10001', '10001', '10101', '11011', '10001'],
  Y: ['101', '101', '010', '010', '010'], Z: ['111', '001', '010', '100', '111'],
  '!': ['1', '1', '1', '0', '1'], '?': ['111', '001', '011', '000', '010'],
  '.': ['0', '0', '0', '0', '1'], ' ': ['00', '00', '00', '00', '00'],
  '♪': ['011', '011', '010', '110', '110'], '♥': ['01010', '11111', '11111', '01110', '00100'],
  '+': ['000', '010', '111', '010', '000'], '~': ['0000', '0000', '0101', '1010', '0000'],
};

export function textWidth(str, scale = 1) {
  return [...String(str)].reduce((w, ch) => w + ((GLYPHS[ch]?.[0].length ?? 3) + 1) * scale, -scale);
}

export function pixelText(g, str, x, y, scale, color) {
  let cx = Math.round(x);
  g.fillStyle = color;
  for (const ch of String(str).toUpperCase()) {
    const glyph = GLYPHS[ch] ?? GLYPHS[' '];
    glyph.forEach((row, ry) => {
      [...row].forEach((bit, rx) => {
        if (bit === '1') g.fillRect(cx + rx * scale, Math.round(y) + ry * scale, scale, scale);
      });
    });
    cx += (glyph[0].length + 1) * scale;
  }
}

// ------------------------------------------------------------------- the cast

export const LOOKS = {
  // 龍哥 — 主持: the dragon in the station's green jacket and a yellow tie.
  lung: { species: 'dragon', skin: '#3fc1c9', belly: '#d8f7f3', dark: '#2a8f96', horn: '#fff1c7', suit: '#0b6b3a', tie: '#ffd200', shoe: '#1a1a1a' },
  // 曉佳 — 助手: a rabbit, quick on the draw.
  gaai: { species: 'rabbit', skin: '#fffafa', ear: '#ffb3c6', dark: '#d9c7c7', suit: '#d0367a', bow: '#ffd200', shoe: '#7a1a44' },
  // 曉曼 — a duck in glasses.
  maan: { species: 'duck', skin: '#ffd93d', bill: '#ff9f1c', dark: '#e0b400', suit: '#7a4fd0', glasses: true, shoe: '#ff9f1c' },
  // 豪仔 — the frog with the headphones, always too excited.
  ho: { species: 'frog', skin: '#6bcb77', belly: '#c8f0cc', dark: '#3f9a4b', suit: '#e06a00', headphones: '#1a1a1a', shoe: '#1a1a1a' },
  // 婆婆 — a granny with a bun and pearls.
  por: { species: 'human', style: 'granny', skin: '#f0c8a8', dark: '#c99a7a', hair: '#e8e8e8', glasses: true, pearls: true, suit: '#8a6d3b', collar: '#f1f1e6', shoe: '#3a2a1a' },
  // 細妹 — a little pig with a bow.
  mui: { species: 'pig', skin: '#ffb3c6', snout: '#ff8fab', dark: '#e0789a', bow: '#ffd200', suit: '#1c7fd6', collar: '#ffffff', shoe: '#e02020' },
};

const INK = '#1a1a1a';

function drawEyes(g, x, y, s, { left, right, size = 2, iris = INK, white = null }) {
  const P = (dx, dy, w, h, c) => rect(g, x + dx, y + dy, w, h, c);
  const e = s.emotion || 'neutral';
  for (const ex of [left, right]) {
    if (white) P(ex[0] - 1, ex[1] - 1, size + 2, size + 2, white);
    if (s.blink) P(ex[0], ex[1] + size - 1, size, 1, iris);
    else if (e === 'surprised') P(ex[0], ex[1] - 1, size, size + 1, iris);
    else if (e === 'happy') {
      P(ex[0], ex[1] + 1, size, 1, iris);
      P(ex[0] - 1, ex[1], 1, 1, iris);
      P(ex[0] + size, ex[1], 1, 1, iris);
    } else if (e === 'sad') {
      P(ex[0], ex[1] + 1, size, 1, iris);
      P(ex[0] - 1, ex[1] + 2, 1, 1, iris);
      P(ex[0] + size, ex[1] + 2, 1, 1, iris);
    } else P(ex[0], ex[1], size, size, iris);
  }
}

function drawMouth(g, x, y, s, mx, my, lip = '#5a1a1a', wide = 4) {
  const P = (dx, dy, w, h, c) => rect(g, x + dx, y + dy, w, h, c);
  const e = s.emotion || 'neutral';
  const mouth = s.talking ? s.mouth || 0 : 0;
  if (mouth === 2) {
    P(mx - 1, my - 1, wide + 2, 3, '#5a1a1a');
    P(mx, my - 1, wide, 1, '#f4f4f4');
  } else if (mouth === 1) P(mx, my, wide, 2, '#5a1a1a');
  else if (e === 'happy') { P(mx - 1, my - 1, 1, 1, lip); P(mx, my, wide, 1, lip); P(mx + wide, my - 1, 1, 1, lip); }
  else if (e === 'surprised') P(mx + 1, my - 1, wide - 2, 3, '#5a1a1a');
  else if (e === 'sad') { P(mx - 1, my + 1, 1, 1, lip); P(mx, my, wide, 1, lip); P(mx + wide, my + 1, 1, 1, lip); }
  else P(mx, my, wide, 1, lip);
}

const SPECIES = {
  dragon(g, x, y, look, s) {
    const P = (dx, dy, w, h, c) => rect(g, x + dx, y + dy, w, h, c);
    P(-9, 1, 18, 15, look.skin);
    P(-8, 0, 16, 1, look.skin);
    P(-9, 16, 18, 1, look.dark);
    for (const [sx, sy] of [[-4, -2], [-1, -3], [2, -2]]) P(sx, sy, 2, 3, look.dark);
    P(-8, -4, 2, 5, look.horn); P(6, -4, 2, 5, look.horn);
    P(-5, 9, 10, 6, look.belly);
    P(-3, 10, 1, 1, look.dark); P(2, 10, 1, 1, look.dark);
    drawEyes(g, x, y, s, { left: [-6, 5], right: [3, 5], white: '#ffffff' });
    drawMouth(g, x, y, s, -2, 13, look.dark);
    if (s.talking && s.mouth === 2) { P(-11, 11, 2, 1, '#ff9f1c'); P(-12, 10, 1, 1, '#ffd93d'); }
  },
  pig(g, x, y, look, s) {
    const P = (dx, dy, w, h, c) => rect(g, x + dx, y + dy, w, h, c);
    P(-9, 1, 18, 15, look.skin);
    P(-8, 0, 16, 1, look.skin);
    P(-9, -3, 3, 4, look.skin); P(6, -3, 3, 4, look.skin);
    P(-8, -2, 1, 2, look.snout); P(7, -2, 1, 2, look.snout);
    P(-4, 8, 8, 5, look.snout);
    P(-2, 10, 1, 2, look.dark); P(1, 10, 1, 2, look.dark);
    P(-9, 7, 2, 1, '#ff6f91'); P(7, 7, 2, 1, '#ff6f91');
    P(4, -5, 3, 3, look.bow); P(8, -5, 3, 3, look.bow); P(7, -4, 1, 1, shade(look.bow, -40));
    drawEyes(g, x, y, s, { left: [-6, 4], right: [3, 4] });
    drawMouth(g, x, y, s, -2, 14, look.dark);
  },
  duck(g, x, y, look, s) {
    const P = (dx, dy, w, h, c) => rect(g, x + dx, y + dy, w, h, c);
    P(-8, 1, 16, 14, look.skin);
    P(-7, 0, 14, 1, look.skin);
    P(-7, 15, 14, 1, look.dark);
    P(-2, -3, 1, 3, look.dark); P(0, -4, 1, 4, look.dark); P(2, -3, 1, 3, look.dark);
    drawEyes(g, x, y, s, { left: [-5, 4], right: [3, 4] });
    if (look.glasses) {
      for (const ex of [-6, 2]) { P(ex, 3, 4, 1, INK); P(ex, 6, 4, 1, INK); P(ex, 4, 1, 2, INK); P(ex + 3, 4, 1, 2, INK); }
      P(-2, 4, 4, 1, INK);
    }
    const open = s.talking ? s.mouth || 0 : 0;
    if (open) {
      P(-6, 8, 12, 2, look.bill);
      P(-5, 10, 10, open, '#5a1a1a');
      P(-6, 10 + open, 12, 2, shade(look.bill, -20));
    } else {
      P(-6, 9, 12, 3, look.bill);
      P(-6, 11, 12, 1, shade(look.bill, -25));
    }
  },
  frog(g, x, y, look, s) {
    const P = (dx, dy, w, h, c) => rect(g, x + dx, y + dy, w, h, c);
    P(-10, 3, 20, 13, look.skin);
    P(-9, 2, 18, 1, look.skin);
    P(-7, 11, 14, 5, look.belly);
    P(-10, -2, 6, 6, look.skin); P(4, -2, 6, 6, look.skin);
    drawEyes(g, x, y, s, { left: [-8, 0], right: [6, 0], white: '#ffffff' });
    P(-9, 8, 2, 1, '#ff8fab'); P(7, 8, 2, 1, '#ff8fab');
    if (look.headphones) {
      P(-11, -3, 22, 1, look.headphones);
      P(-12, 0, 3, 7, look.headphones); P(9, 0, 3, 7, look.headphones);
      P(-11, 2, 1, 3, '#7fd3ff'); P(10, 2, 1, 3, '#7fd3ff');
    }
    drawMouth(g, x, y, s, -4, 13, look.dark, 8);
  },
  rabbit(g, x, y, look, s) {
    const P = (dx, dy, w, h, c) => rect(g, x + dx, y + dy, w, h, c);
    // The ears flop back a pixel when it hops.
    const flop = s.airborne ? 1 : 0;
    P(-7 - flop, -12 + flop, 4, 13, look.skin); P(3 + flop, -12 + flop, 4, 13, look.skin);
    P(-6 - flop, -10 + flop, 2, 9, look.ear); P(4 + flop, -10 + flop, 2, 9, look.ear);
    P(-8, 1, 16, 15, look.skin);
    P(-7, 0, 14, 1, look.skin);
    P(-8, 16, 16, 1, look.dark);
    drawEyes(g, x, y, s, { left: [-5, 5], right: [3, 5] });
    P(-1, 9, 2, 1, '#ff8fab');
    P(-8, 10, 3, 1, look.dark); P(5, 10, 3, 1, look.dark);
    P(-7, 7, 2, 1, '#ffc2d1'); P(5, 7, 2, 1, '#ffc2d1');
    if (look.bow) { P(5, -6, 3, 3, look.bow); P(8, -8, 3, 3, look.bow); }
    drawMouth(g, x, y, s, -2, 12, look.dark);
  },
  human(g, x, y, look, s) {
    const P = (dx, dy, w, h, c) => rect(g, x + dx, y + dy, w, h, c);
    const hair = look.hair || INK;
    P(-8, 1, 16, 15, look.skin);
    P(-7, 0, 14, 1, look.skin);
    P(-7, 16, 14, 1, look.dark);
    if (look.style === 'granny') {
      P(-3, -6, 6, 5, hair); P(-2, -7, 4, 1, hair); // the bun
      P(-4, -4, 1, 1, '#c2185b'); // a hairpin
      P(-8, -1, 16, 4, hair); P(-9, 1, 2, 8, hair); P(7, 1, 2, 8, hair);
      P(-7, 10, 1, 1, look.dark); P(6, 10, 1, 1, look.dark);
      P(-7, 9, 2, 1, '#ffb3b3'); P(5, 9, 2, 1, '#ffb3b3');
    }
    if (look.glasses) { P(-6, 6, 4, 2, '#e4edf2'); P(2, 6, 4, 2, '#e4edf2'); }
    drawEyes(g, x, y, s, { left: [-5, 6], right: [3, 6] });
    if (look.glasses) {
      for (const ex of [-7, 1]) { P(ex, 5, 6, 1, INK); P(ex, 8, 6, 1, INK); P(ex, 5, 1, 4, INK); P(ex + 5, 5, 1, 4, INK); }
      P(-1, 6, 2, 1, INK);
    }
    P(-1, 9, 2, 2, look.dark);
    drawMouth(g, x, y, s, -2, 13, look.lip || look.dark);
    if (look.pearls) for (let i = 0; i < 5; i++) P(-4 + i * 2, i === 0 || i === 4 ? 18 : 19, 1, 1, '#f4f4f4');
  },
};

/**
 * A standing body: a jacket, two arms and two legs. `s.step` (0..1) walks the
 * legs and swings the arms; `s.action` is 'wave', 'cheer' (both arms up),
 * 'mic' (holding a microphone) or nothing.
 */
function drawBody(g, x, y, look, s) {
  const P = (dx, dy, w, h, c) => rect(g, x + dx, y + dy, w, h, c);
  const t = s.t || 0;
  const swing = s.walking ? Math.round(Math.sin((s.step || 0) * Math.PI * 2) * 2) : 0;

  // Legs, then shoes: one forward, one back while walking; tucked in mid-air.
  // A dancer's crouch sinks the whole body and shortens the legs, so the
  // shoes stay on the floor; a kick swings one leg out sideways.
  const pose = s.pose || {};
  const sq = s.airborne ? 0 : pose.squat || 0;
  const legL = s.airborne ? 3 : 5 - sq + (swing > 0 ? 1 : 0);
  const legR = s.airborne ? 3 : 5 - sq + (swing < 0 ? 1 : 0);
  const trouser = shade(look.suit, -45);
  if (pose.kick === 'L' && !s.airborne) { P(-11, 31, 7, 3, trouser); P(-14, 30, 3, 4, look.shoe || INK); }
  else { P(-6, 31, 4, legL, trouser); P(-7, 31 + legL, 5, 2, look.shoe || INK); }
  if (pose.kick === 'R' && !s.airborne) { P(4, 31, 7, 3, trouser); P(11, 30, 3, 4, look.shoe || INK); }
  else { P(2, 31, 4, legR, trouser); P(2, 31 + legR, 5, 2, look.shoe || INK); }

  P(-9, 17, 18, 15, look.suit);
  P(-9, 17, 18, 2, shade(look.suit, 25));
  if (look.collar) { P(-5, 17, 10, 2, look.collar); P(-2, 19, 4, 2, look.collar); }
  if (look.tie) { P(-2, 17, 4, 2, '#ffffff'); P(-1, 19, 2, 8, look.tie); }
  P(-1, 23, 1, 1, shade(look.suit, -30)); P(-1, 27, 1, 1, shade(look.suit, -30)); // buttons

  const arm = look.skin;
  const act = s.action;
  if (act === 'dance' && pose.arms) {
    pose.arms(P, arm);
  } else if (act === 'cheer') {
    const flap = Math.floor(t / 140) % 2;
    P(-13, 9 - flap, 3, 10, arm); P(10, 9 - (1 - flap), 3, 10, arm);
  } else if (act === 'wave') {
    P(-12, 19 + swing, 3, 10, arm);
    const w = Math.floor(t / 180) % 2 ? 1 : -1;
    P(10, 9, 3, 10, arm); P(10 + w, 7, 4, 3, arm);
  } else if (act === 'mic') {
    P(-12, 19, 3, 10, arm);
    P(6, 17, 6, 3, arm); // the elbow in, the hand at the mouth
    P(8, 13, 3, 5, arm);
    P(9, 9, 3, 3, '#4a4a4a'); P(10, 12, 1, 3, '#9a9a9a'); // the microphone
  } else if (act === 'crank') {
    // Left hand on the cage's handle, going round.
    const a = (t / 70) % (Math.PI * 2);
    const hy = 19 + Math.round(Math.sin(a) * 3);
    P(-15, Math.min(hy, 20), 6, Math.abs(hy - 20) + 3, arm);
    P(-18 + Math.round(Math.cos(a) * 2), hy, 4, 3, arm);
    P(9, 19, 3, 10, arm);
  } else if (act === 'hold') {
    // Both arms straight up: the ball is held over the head (show.js draws it).
    P(-12, 4, 3, 14, arm); P(9, 4, 3, 14, arm);
  } else if (act === 'throw') {
    P(-12, 19, 3, 10, arm);
    P(9, 10, 3, 9, arm); P(11, 6, 4, 5, arm); // flung up and forward
  } else if (act === 'shrug') {
    P(-13, 17, 4, 3, arm); P(-15, 15, 3, 3, arm);
    P(9, 17, 4, 3, arm); P(12, 15, 3, 3, arm);
  } else {
    P(-12, 19 + swing, 3, 10, arm);
    P(9, 19 - swing, 3, 10, arm);
  }
}

/** One caller. `s`: {t, step, walking, airborne, talking, mouth, emotion, blink, action}. */
export function drawCreature(g, id, x, y, s = {}) {
  const look = LOOKS[id] || LOOKS.lung;
  let pose = null;
  if (s.action === 'dance') pose = (DANCES[id] || DANCES.lung).pose(s.t || 0);
  if (!pose) {
    drawBody(g, x, y, look, s);
    (SPECIES[look.species] || SPECIES.dragon)(g, x, y + (s.headDy || 0), look, s);
    return;
  }
  // A dance move can sway the whole figure, crouch it, or face it the other way.
  g.save();
  g.translate(Math.round(x + (pose.dx || 0)), 0);
  if (pose.flip) g.scale(-1, 1);
  const sq = s.airborne ? 0 : pose.squat || 0;
  drawBody(g, 0, y + sq, look, { ...s, pose });
  (SPECIES[look.species] || SPECIES.dragon)(g, 0, y + sq + (pose.headDy || 0), look, s);
  g.restore();
}

/** How far above `y` the tallest bit (ears, bun, horns) reaches: for placing bubbles. */
export const HEAD_TOP = { dragon: -4, pig: -5, duck: -4, frog: -3, rabbit: -12, human: -7 };
export const speciesOf = (id) => (LOOKS[id] || LOOKS.lung).species;

// ------------------------------------------------------------------- dances

/**
 * When someone wins, each caller has a dance of their own, all to the same
 * beat. `pose(t)` gives the figure for this moment: arms (a function that
 * draws them), a sideways sway `dx`, a crouch `squat` (0..3), a kicked leg,
 * whether it faces the other way; `hop(beat)` says how high to jump on that
 * beat, if at all.
 */
export const BEAT = 480; // ms: 125 bpm, party tempo

// An arm as a run of 3×3 blocks from (x, y), each step moving (sx, sy).
const limb = (P, c, x, y, sx, sy, n) => { for (let i = 0; i < n; i++) P(x + sx * i, y + sy * i, 3, Math.max(3, Math.abs(sy)), c); };

export const DANCES = {
  // 龍哥: disco — one finger to the ceiling, the other hand on the hip,
  // then down to the floor, the hips swinging; turns round every four beats.
  lung: {
    name: 'disco',
    pose(t) {
      const b = Math.floor(t / BEAT);
      const up = b % 2 === 0;
      return {
        dx: up ? 2 : -2,
        flip: Math.floor(b / 4) % 2 === 1,
        arms(P, c) {
          P(-13, 20, 3, 3, c); P(-11, 23, 3, 3, c); // hand on hip
          if (up) { limb(P, c, 9, 15, 2, -4, 3); P(14, 3, 1, 3, c); }
          else { limb(P, c, 9, 20, 2, 3, 3); P(15, 29, 1, 3, c); }
        },
      };
    },
    hop: () => 0,
  },
  // 曉佳: bunny hops — paws up in front, three little hops and a big one,
  // then off the other way.
  gaai: {
    name: 'bunny hop',
    pose(t) {
      const b = Math.floor(t / BEAT);
      return {
        flip: Math.floor(b / 4) % 2 === 1,
        dx: ((b % 4) - 1.5) * 1.5,
        arms(P, c) { P(-12, 19, 3, 5, c); P(9, 19, 3, 5, c); P(-10, 18, 5, 3, c); P(5, 18, 5, 3, c); P(-6, 21, 2, 1, c); P(5, 21, 2, 1, c); },
      };
    },
    hop: (b) => (b % 4 === 3 ? 3.6 : 2),
  },
  // 曉曼: the chicken dance, naturally — wings flapping, bobbing down and
  // up, tail wagging.
  maan: {
    name: 'chicken dance',
    pose(t) {
      const b = Math.floor(t / BEAT);
      const flap = Math.floor(t / (BEAT / 4)) % 2;
      return {
        squat: b % 2 ? 3 : 0,
        dx: flap ? 1 : -1,
        arms(P, c) {
          // Elbows out, hands tucked at the armpits: wings.
          P(-12, 18, 3, 3, c); P(9, 18, 3, 3, c);
          P(-15, 19 - flap * 3, 4, 3 + flap, c); P(11, 19 - flap * 3, 4, 3 + flap, c);
        },
      };
    },
    hop: () => 0,
  },
  // 豪仔: spins on the spot, crouches, and leaps with arms and legs flung
  // out like a star.
  ho: {
    name: 'spin & star jump',
    pose(t) {
      const b = Math.floor(t / BEAT);
      const k = b % 4;
      if (k < 2) {
        return {
          flip: Math.floor(t / 110) % 2 === 1,
          arms(P, c) { P(-12, 18, 3, 3, c); P(-17, 17, 6, 3, c); P(9, 7, 3, 12, c); P(8, 4, 5, 3, c); }, // one arm out, one up
        };
      }
      if (k === 2) return { squat: 3, arms(P, c) { P(-12, 22, 3, 6, c); P(9, 22, 3, 6, c); } };
      return {
        kick: Math.floor(t / 200) % 2 ? 'L' : 'R',
        arms(P, c) { limb(P, c, -12, 16, -2, -3, 3); limb(P, c, 9, 16, 2, -3, 3); },
      };
    },
    hop: (b) => (b % 4 === 3 ? 3.8 : 0),
  },
  // 婆婆: the twist — slowly down and up, hips going one way, arms the
  // other. Grannies don't jump.
  por: {
    name: 'the twist',
    pose(t) {
      const w = Math.sin((t / (BEAT * 2)) * Math.PI * 2);
      const side = Math.sin((t / BEAT) * Math.PI) > 0;
      return {
        squat: Math.round(1.5 + Math.sin((t / (BEAT * 4)) * Math.PI * 2) * 1.5),
        dx: Math.round(w * 2),
        arms(P, c) {
          // Elbows bent, forearms swinging across together.
          P(-12, 19, 3, 5, c); P(9, 19, 3, 5, c);
          if (side) { P(-9, 22, 4, 3, c); P(12, 22, 4, 3, c); }
          else { P(-16, 22, 4, 3, c); P(5, 22, 4, 3, c); }
        },
      };
    },
    hop: () => 0,
  },
  // 細妹: Y, M, C, A! and a jump.
  mui: {
    name: 'YMCA',
    pose(t) {
      const k = Math.floor(t / BEAT) % 4;
      const arms = [
        (P, c) => { limb(P, c, -12, 15, -2, -4, 4); limb(P, c, 9, 15, 2, -4, 4); },          // Y
        (P, c) => { P(-12, -1, 3, 20, c); P(9, -1, 3, 20, c); P(-10, -3, 5, 3, c); P(5, -3, 5, 3, c); }, // M: hands on head
        (P, c) => { limb(P, c, -12, 15, -1, -4, 4); P(-13, 0, 6, 3, c); P(9, 19, 3, 9, c); P(5, 26, 6, 3, c); }, // C
        (P, c) => { limb(P, c, -12, 14, 2, -4, 5); limb(P, c, 9, 14, -2, -4, 5); },          // A: hands meet up top
      ];
      return { arms: arms[k], headDy: k === 1 ? 1 : 0 };
    },
    hop: (b) => (b % 4 === 3 ? 2.6 : 0),
  },
};

/** Just the head, for a player's icon: centred on `x`, its tallest bit at `top`. */
export function drawHead(g, id, x, top, s = {}) {
  const look = LOOKS[id] || LOOKS.lung;
  (SPECIES[look.species] || SPECIES.dragon)(g, x, top - (HEAD_TOP[look.species] || -4), look, s);
}
