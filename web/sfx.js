/**
 * 音效 — every sound that isn't a voice, synthesised with Web Audio, so there
 * are no files to fetch and nothing to license.
 *
 * Tension builds with the game: the drumroll under each draw gets faster and
 * louder, and its riser climbs higher, the more balls are out; between draws
 * a heartbeat starts once the game is a third of the way in and quickens
 * from there. It all ducks while someone is speaking.
 *
 * A browser only lets a page make sound after a tap or a key, so `unlock()`
 * is called from the first one.
 */

export function createSfx() {
  let ctx = null;
  let master = null;
  let noise = null;
  let enabled = true;
  let beatOn = true;
  let tension = 0;     // 0..1, how far into the game
  let ducked = false;
  let beatTimer = 0;
  let roll = null;

  function unlock() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    try {
      ctx = new AudioContext();
      master = ctx.createGain();
      master.gain.value = 0.8;
      master.connect(ctx.destination);
      // Two seconds of white noise: the raw stuff of drums, claps and crashes.
      noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      scheduleBeat();
    } catch { ctx = null; }
  }

  const ready = () => enabled && ctx && ctx.state === 'running';

  // ----------------------------------------------------------- building blocks

  function env(gain, at, peak, attack, decay) {
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(peak, at + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + attack + decay);
  }

  function tone(freq, at, { type = 'square', peak = 0.08, attack = 0.005, decay = 0.2, to = null, filter = null } = {}) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, at);
    if (to) o.frequency.exponentialRampToValueAtTime(to, at + attack + decay);
    env(g, at, peak, attack, decay);
    let node = o;
    if (filter) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = filter; o.connect(f); node = f; }
    node.connect(g).connect(master);
    o.start(at);
    o.stop(at + attack + decay + 0.05);
  }

  function hiss(at, { type = 'highpass', freq = 1000, q = 0.7, peak = 0.2, attack = 0.002, decay = 0.1, sweepTo = null } = {}) {
    const src = ctx.createBufferSource();
    src.buffer = noise;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, at);
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, at + attack + decay);
    f.Q.value = q;
    const g = ctx.createGain();
    env(g, at, peak, attack, decay);
    src.connect(f).connect(g).connect(master);
    src.start(at, Math.random() * 1.5);
    src.stop(at + attack + decay + 0.05);
  }

  const snare = (at, peak) => { hiss(at, { freq: 1800, peak, decay: 0.07 }); tone(190, at, { type: 'triangle', peak: peak * 0.4, decay: 0.05 }); };
  const kick = (at, peak = 0.5) => tone(110, at, { type: 'sine', peak, attack: 0.003, decay: 0.22, to: 40 });

  // ----------------------------------------------------------- the draw

  /** A drumroll and a rising tone, for as long as the cage turns. */
  function startRoll() {
    stopRoll();
    if (!ready()) return;
    const t0 = ctx.currentTime;
    // Later in the game: faster, louder, higher.
    const rate = 11 + tension * 16;
    const peak = 0.06 + tension * 0.1;
    const riser = ctx.createOscillator();
    const rg = ctx.createGain();
    const rf = ctx.createBiquadFilter();
    riser.type = 'sawtooth';
    riser.frequency.setValueAtTime(140, t0);
    riser.frequency.exponentialRampToValueAtTime(260 + tension * 700, t0 + 2.6);
    rf.type = 'lowpass';
    rf.frequency.value = 900 + tension * 1800;
    rg.gain.setValueAtTime(0.0001, t0);
    rg.gain.exponentialRampToValueAtTime(0.02 + tension * 0.035, t0 + 1.8);
    riser.connect(rf).connect(rg).connect(master);
    riser.start(t0);

    let next = t0;
    let n = 0;
    const timer = setInterval(() => {
      // Schedule a little ahead so the roll stays even when the page is busy.
      while (next < ctx.currentTime + 0.1) {
        const swell = Math.min(1, 0.35 + n / 40);
        snare(next, peak * swell * (n % 2 ? 0.7 : 1));
        next += 1 / rate;
        n++;
      }
    }, 25);
    roll = { timer, riser, rg };
  }

  function stopRoll() {
    if (!roll) return;
    clearInterval(roll.timer);
    const t = ctx.currentTime;
    roll.rg.gain.cancelScheduledValues(t);
    roll.rg.gain.setValueAtTime(roll.rg.gain.value, t);
    roll.rg.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
    roll.riser.stop(t + 0.1);
    roll = null;
  }

  /** The ball lands: a thump, a cymbal and a bell. */
  function land() {
    stopRoll();
    if (!ready()) return;
    const t = ctx.currentTime;
    kick(t, 0.6);
    hiss(t, { freq: 5000, peak: 0.12 + tension * 0.1, decay: 1.1 });
    tone(880, t, { type: 'triangle', peak: 0.12, decay: 0.3 });
    tone(1320, t + 0.09, { type: 'triangle', peak: 0.09, decay: 0.45 });
  }

  /** The cage spits a ball out. */
  function pop() {
    if (!ready()) return;
    const t = ctx.currentTime;
    tone(520, t, { type: 'square', peak: 0.06, decay: 0.08, to: 1100, filter: 2400 });
    tone(2400, t + 0.02, { type: 'sine', peak: 0.03, decay: 0.05 });
  }

  /** The rabbit throws it. */
  function whoosh() {
    if (!ready()) return;
    hiss(ctx.currentTime, { type: 'bandpass', freq: 400, q: 2, peak: 0.12, attack: 0.15, decay: 0.3, sweepTo: 3000 });
  }

  /** A wooden rattle as the cage turns, now and then. */
  function rattle() {
    if (!ready()) return;
    const t = ctx.currentTime;
    for (let i = 0; i < 3; i++) tone(900 + Math.random() * 900, t + i * 0.03, { type: 'square', peak: 0.015, decay: 0.02, filter: 3000 });
  }

  /** The countdown to the next ball: a tick, a higher one for the last. */
  function tick(high) {
    if (!ready()) return;
    const t = ctx.currentTime;
    tone(high ? 1760 : 1180, t, { type: 'square', peak: 0.05, decay: 0.05, filter: 4000 });
    tone(high ? 880 : 590, t, { type: 'triangle', peak: 0.04, decay: 0.08 });
  }

  // ----------------------------------------------------------- Bingo!

  /** Someone shouts Bingo: an alarm and an air horn. */
  function alarm() {
    stopRoll();
    if (!ready()) return;
    const t = ctx.currentTime;
    for (let i = 0; i < 6; i++) tone(i % 2 ? 660 : 990, t + i * 0.13, { type: 'square', peak: 0.07, attack: 0.005, decay: 0.12, filter: 3000 });
    for (const f of [233, 294, 349]) tone(f, t + 0.8, { type: 'sawtooth', peak: 0.07, attack: 0.03, decay: 0.7, filter: 2200 });
  }

  /** A real Bingo: a fanfare, then the room claps and cheers. */
  function fanfare() {
    if (!ready()) return;
    const t = ctx.currentTime;
    const brass = (f, at, len, peak = 0.07) => {
      for (const det of [0, 4]) tone(f + det, at, { type: 'sawtooth', peak, attack: 0.02, decay: len, filter: 2600 });
      tone(f / 2, at, { type: 'square', peak: peak * 0.4, attack: 0.02, decay: len, filter: 900 });
    };
    // G C E G – E G (held) – C' chord
    const C5 = 523.25, E5 = 659.25, G4 = 392, G5 = 783.99, C6 = 1046.5;
    [[G4, 0, 0.12], [C5, 0.13, 0.12], [E5, 0.26, 0.12], [G5, 0.39, 0.3], [E5, 0.72, 0.12], [G5, 0.85, 0.7]]
      .forEach(([f, at, len]) => brass(f, t + at, len));
    for (const f of [C5, E5, G5, C6]) brass(f, t + 1.6, 1.4, 0.05);
    kick(t + 1.6, 0.6);
    hiss(t + 1.6, { freq: 4500, peak: 0.18, decay: 1.6 });
    applause(t + 0.4, 5);
  }

  function applause(at, seconds) {
    // The crowd: a bed of soft noise that swells and fades…
    hiss(at, { type: 'bandpass', freq: 1200, q: 0.5, peak: 0.07, attack: 0.8, decay: seconds });
    // …and hundreds of single claps, thickest in the middle.
    const claps = Math.round(seconds * 60);
    for (let i = 0; i < claps; i++) {
      const x = Math.random();
      const when = at + x * seconds;
      const loud = Math.sin(Math.PI * Math.min(1, x * 1.6)) * 0.12 + 0.02;
      hiss(when, { type: 'bandpass', freq: 1400 + Math.random() * 1800, q: 1.2, peak: loud, decay: 0.03 + Math.random() * 0.03 });
    }
    // A couple of whistles.
    tone(1800, at + 0.6, { type: 'sine', peak: 0.04, attack: 0.05, decay: 0.35, to: 2600 });
    tone(2000, at + 1.5, { type: 'sine', peak: 0.035, attack: 0.05, decay: 0.5, to: 1500 });
  }

  /** A firework: the whistle up is the page's job, this is the bang and the crackle. */
  function firework() {
    if (!ready()) return;
    const t = ctx.currentTime;
    kick(t, 0.25);
    hiss(t, { type: 'lowpass', freq: 1200, peak: 0.16, decay: 0.5 });
    for (let i = 0; i < 8; i++) hiss(t + 0.15 + Math.random() * 0.5, { freq: 3000, peak: 0.05, decay: 0.02 });
  }

  /** A false claim: the sad trombone. */
  function womp() {
    if (!ready()) return;
    const t = ctx.currentTime;
    [[392, 0], [370, 0.35], [349, 0.7]].forEach(([f, at]) => tone(f, t + at, { type: 'sawtooth', peak: 0.06, attack: 0.03, decay: 0.3, filter: 1200 }));
    tone(330, t + 1.05, { type: 'sawtooth', peak: 0.06, attack: 0.03, decay: 1, to: 300, filter: 1200 });
  }

  // ----------------------------------------------------------- heartbeat

  /** Lub-dub between draws once things get tense, quicker as the game goes on. */
  function scheduleBeat() {
    clearTimeout(beatTimer);
    const bpm = 58 + tension * 70;
    beatTimer = setTimeout(scheduleBeat, 60000 / bpm);
    if (!ready() || !beatOn || ducked || roll || tension < 0.3) return;
    const t = ctx.currentTime;
    const peak = 0.12 + (tension - 0.3) * 0.35;
    kick(t, peak);
    kick(t + 0.17, peak * 0.7);
  }

  return {
    unlock,
    startRoll, stopRoll, land, pop, whoosh, rattle, tick,
    alarm, fanfare, firework, womp,
    /** 0..1: how far in. */
    setTension(v) { tension = Math.max(0, Math.min(1, v)); },
    /** True while a voice is speaking or a dialog is open: the heartbeat waits. */
    duck(v) { ducked = v; },
    setEnabled(v) { enabled = v; if (!v) stopRoll(); },
    setHeartbeat(v) { beatOn = v; },
  };
}
