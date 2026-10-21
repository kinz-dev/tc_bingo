/**
 * 玩家頭像 — the pixel icons a player can pick: the six callers' heads, and a
 * dozen more drawn here a character to a pixel. Each is drawn once into a
 * small canvas and handed out as an image URL.
 */

import { drawHead } from './sprites.js';

const SIZE = 32;

// '.' is see-through; every other letter is a colour from the icon's palette.
const ART = {
  cat: {
    name: '貓', pal: { o: '#f28c28', d: '#1a1a1a', p: '#ff8fab', w: '#ffffff' },
    rows: [
      '.o........o.',
      '.oo......oo.',
      '.oooooooooo.',
      'oooooooooooo',
      'oodoooooodoo',
      'oodoooooodoo',
      'wooooppoooow',
      '.ooooddoooo.',
      '.oooooooooo.',
      '..oooooooo..',
    ],
  },
  panda: {
    name: '熊貓', pal: { k: '#1a1a1a', w: '#ffffff' },
    rows: [
      '.kk......kk.',
      'kkkwwwwwwkkk',
      '.kwwwwwwwwk.',
      '.wwwwwwwwww.',
      'wkkkwwwwkkkw',
      'wkwkwwwwkwkw',
      'wkkkwwwwkkkw',
      'wwwwwkkwwwww',
      '.wwwwkkwwww.',
      '..wwwwwwww..',
    ],
  },
  bear: {
    name: '熊', pal: { b: '#8b5a2b', l: '#d9a066', k: '#1a1a1a' },
    rows: [
      '.bb......bb.',
      'blbb....bblb',
      '.bbbbbbbbbb.',
      'bbbbbbbbbbbb',
      'bbkbbbbbbkbb',
      'bbbbbbbbbbbb',
      'bbbbllllbbbb',
      'bbbllkkllbbb',
      '.bbbllllbbb.',
      '..bbbbbbbb..',
    ],
  },
  chick: {
    name: '雞仔', pal: { y: '#ffd93d', o: '#ff9f1c', k: '#1a1a1a' },
    rows: [
      '.....yy.....',
      '....yyyy....',
      '...yyyyyy...',
      '..yykyykyy..',
      '..yyyooyyy..',
      '.yyyyyyyyyy.',
      'yyyyyyyyyyyy',
      'yyyyyyyyyyyy',
      '.yyyyyyyyyy.',
      '..yyyyyyyy..',
      '...oo..oo...',
    ],
  },
  ghost: {
    name: '鬼仔', pal: { w: '#f4f4f4', k: '#1a1a1a', p: '#ffb3c6' },
    rows: [
      '...wwwwww...',
      '..wwwwwwww..',
      '.wwwwwwwwww.',
      '.wwkkwwkkww.',
      '.wwkkwwkkww.',
      '.wpwwwwwwpw.',
      '.wwwwkkwwww.',
      '.wwwwkkwwww.',
      '.wwwwwwwwww.',
      '.wwwwwwwwww.',
      '.ww..ww..ww.',
    ],
  },
  robot: {
    name: '機械人', pal: { g: '#9aa5b1', d: '#5a6b7d', c: '#7fd3ff', r: '#e02020' },
    rows: [
      '.....rr.....',
      '.....dd.....',
      '.gggggggggg.',
      '.gddddddddg.',
      'ggdccddccdgg',
      'ggdccddccdgg',
      '.gddddddddg.',
      '.gdrrrrrrdg.',
      '.gddddddddg.',
      '.gggggggggg.',
      '...dd..dd...',
    ],
  },
  milktea: {
    name: '奶茶', pal: { s: '#c9ccd1', c: '#ffffff', t: '#c68642', k: '#8a5a2b' },
    rows: [
      '...s..s.....',
      '..s..s......',
      '...s..s.....',
      '.cccccccc...',
      '.cttttttcccc',
      '.cttttttc..c',
      '.cttttttc..c',
      '.cttttttcccc',
      '.cttttttc...',
      '..cccccc....',
      'kkkkkkkkkk..',
    ],
  },
  eggtart: {
    name: '蛋撻', pal: { y: '#ffd93d', o: '#e8a400', p: '#c98b3c', l: '#e8b878' },
    rows: [
      '..yyyyyyyy..',
      '.yyoyyyyyyy.',
      'lyyyyyyyoyyl',
      'plyyyyyyyylp',
      'pplllllllllp',
      '.pplplplplp.',
      '..pppppppp..',
    ],
  },
  fishball: {
    name: '魚蛋', pal: { b: '#e8c07a', d: '#c98b3c', s: '#8b5a2b' },
    rows: [
      '.....s......',
      '....bbb.....',
      '...bbbbd....',
      '...bbbbd....',
      '....bdd.....',
      '.....s......',
      '....bbb.....',
      '...bbbbd....',
      '...bbbbd....',
      '....bdd.....',
      '.....s......',
      '.....s......',
    ],
  },
  star: {
    name: '星星', pal: { y: '#ffd200', o: '#e8a400' },
    rows: [
      '.....yy.....',
      '.....yy.....',
      '....yyyy....',
      'yyyyyyyyyyyy',
      '.yyyyyyyyyy.',
      '..yyyyyyyy..',
      '...yyyyyy...',
      '..yyyyyyyy..',
      '..yyyooyyy..',
      '.yyo....oyy.',
    ],
  },
  heart: {
    name: '心心', pal: { r: '#e02020', w: '#ffffff' },
    rows: [
      '.rrr....rrr.',
      'rrrrr..rrrrr',
      'rwrrrrrrrrrr',
      'rwrrrrrrrrrr',
      'rrrrrrrrrrrr',
      '.rrrrrrrrrr.',
      '..rrrrrrrr..',
      '...rrrrrr...',
      '....rrrr....',
      '.....rr.....',
    ],
  },
  crown: {
    name: '皇冠', pal: { y: '#ffd200', o: '#e8a400', r: '#e02020', b: '#1c7fd6' },
    rows: [
      'y....yy....y',
      'yy..yyyy..yy',
      'yyy.yyyy.yyy',
      'yyyyyyyyyyyy',
      'yryyybbyyyry',
      'yyyyyyyyyyyy',
      'oooooooooooo',
    ],
  },
  mushroom: {
    name: '蘑菇', pal: { r: '#e02020', w: '#ffffff', c: '#f0d8b0', k: '#1a1a1a' },
    rows: [
      '...rrrrrr...',
      '.rrwwrrrrrr.',
      'rrwwrrrrwwrr',
      'rrrrrrrrwwrr',
      'rrrrrrrrrrrr',
      '.wwwwwwwwww.',
      '...cccccc...',
      '...ckcckc...',
      '...cccccc...',
      '...cccccc...',
    ],
  },
};

const CAST_HEADS = { lung: '龍', gaai: '兔仔', maan: '鴨仔', ho: '青蛙', por: '婆婆', mui: '豬仔' };

function canvas() {
  const c = document.createElement('canvas');
  c.width = c.height = SIZE;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  return [c, g];
}

function fromArt({ pal, rows }) {
  const [c, g] = canvas();
  const px = 2;
  const ox = (SIZE - rows[0].length * px) / 2;
  const oy = Math.round((SIZE - rows.length * px) / 2);
  rows.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch === '.' || !pal[ch]) return;
    g.fillStyle = pal[ch];
    g.fillRect(ox + x * px, oy + y * px, px, px);
  }));
  return c.toDataURL();
}

function fromHead(id) {
  const [c, g] = canvas();
  // The heads are about 30 pixels tall, ears and all: centred, one to one.
  drawHead(g, id, SIZE / 2, 1, { emotion: 'happy' });
  return c.toDataURL();
}

let cache = null;

/** [{id, name, url}] — every icon there is, the callers first. */
export function icons() {
  if (!cache) {
    cache = [
      ...Object.entries(CAST_HEADS).map(([id, name]) => ({ id, name, url: fromHead(id) })),
      ...Object.entries(ART).map(([id, art]) => ({ id, name: art.name, url: fromArt(art) })),
    ];
  }
  return cache;
}

export function iconUrl(id) {
  return (icons().find((i) => i.id === id) || icons()[0]).url;
}
