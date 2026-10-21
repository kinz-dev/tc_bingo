/**
 * The callers' voices: lines go in a queue and are said one after another.
 *
 * Audio comes from /api/tts (edge-tts on the box, cached on disk). If that is
 * down — no network at the party venue — the browser's own zh-HK voice says it
 * instead, pitched per character so the host and helper still sound apart.
 */

import { CAST } from './calls.js';

const clipUrl = (text, who) => `api/tts?who=${encodeURIComponent(who)}&text=${encodeURIComponent(text)}`;

export class Voice {
  constructor({ onLine, onLineEnd } = {}) {
    this.onLine = onLine || (() => {});
    this.onLineEnd = onLineEnd || (() => {});
    this.queue = Promise.resolve();
    this.audio = new Audio();
    this.volume = 1;
    this.serverOk = true;
    this.generation = 0;
  }

  /** Start fetching now, so the clip is ready by the time its turn comes. */
  fetchClip(text, who) {
    if (!this.serverOk) return Promise.resolve(null);
    return fetch(clipUrl(text, who))
      .then((r) => (r.ok ? r.blob() : null))
      .then((blob) => (blob && blob.size ? URL.createObjectURL(blob) : null))
      .catch(() => null);
  }

  /**
   * Queue lines [{who, text}] to be said in order. Resolves when the last is said.
   * Every clip is fetched at once, so a three-line call has one wait, not three.
   */
  say(lines) {
    const gen = this.generation;
    const clips = lines.map((l) => this.fetchClip(l.text, l.who));
    this.queue = this.queue.then(async () => {
      for (let i = 0; i < lines.length; i++) {
        if (gen !== this.generation) return;
        const url = await clips[i];
        if (gen !== this.generation) return;
        if (lines[i].before) await lines[i].before();
        this.onLine(lines[i]);
        if (url) await this.play(url);
        else await this.fallback(lines[i]);
        this.onLineEnd(lines[i]);
      }
    });
    return this.queue;
  }

  play(url) {
    return new Promise((resolve) => {
      const a = this.audio;
      const done = () => { a.onended = a.onerror = null; URL.revokeObjectURL(url); resolve(); };
      a.onended = done;
      a.onerror = done;
      a.src = url;
      a.volume = this.volume;
      a.play().catch(done);
    });
  }

  fallback({ who, text }) {
    const synth = globalThis.speechSynthesis;
    if (!synth) return new Promise((r) => setTimeout(r, 1200));
    return new Promise((resolve) => {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'zh-HK';
      const zh = synth.getVoices().find((v) => /zh[-_]HK|yue/i.test(v.lang));
      if (zh) u.voice = zh;
      const c = CAST[who] || {};
      u.pitch = c.pitch || 1;
      u.rate = c.rate || 1;
      u.volume = this.volume;
      u.onend = u.onerror = () => resolve();
      synth.speak(u);
    });
  }

  /** Stop talking and forget everything queued. */
  hush() {
    this.generation++;
    this.audio.pause();
    this.audio.onended?.();
    globalThis.speechSynthesis?.cancel();
    this.queue = Promise.resolve();
    this.onLineEnd(null);
  }

  /** Ask the box to synthesise these ahead of time, a few at a time. */
  async warm(lines, onProgress = () => {}) {
    let done = 0;
    const todo = [...lines];
    const worker = async () => {
      while (todo.length) {
        const { text, who } = todo.shift();
        try {
          const r = await fetch(clipUrl(text, who));
          if (!r.ok) { this.serverOk = r.status !== 503; todo.length = 0; }
          else await r.arrayBuffer();
        } catch { todo.length = 0; }
        onProgress(++done, lines.length);
      }
    };
    await Promise.all([worker(), worker(), worker()]);
  }
}
