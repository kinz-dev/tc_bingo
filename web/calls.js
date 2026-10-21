/**
 * What the callers say — every line in Cantonese, kept apart from the page so
 * the jokes can grow without touching the game.
 *
 * Numbers are written out in characters (七十五, not 75): the zh-HK voices
 * read digits fine, but a written-out number is never read as a year or a price.
 */

export const CAST = {
  lung: { name: '龍哥', role: '主持', color: '#0b6b3a', pitch: 0.9, rate: 1 },
  gaai: { name: '曉佳', role: '助手', color: '#d0367a', pitch: 1.1, rate: 1 },
  maan: { name: '曉曼', role: '嘉賓', color: '#7a4fd0', pitch: 1, rate: 1 },
  ho: { name: '豪仔', role: '好興奮', color: '#e06a00', pitch: 1.2, rate: 1.2 },
  por: { name: '婆婆', role: '慢慢講', color: '#8a6d3b', pitch: 0.8, rate: 0.8 },
  mui: { name: '細妹', role: '細路', color: '#1c7fd6', pitch: 1.5, rate: 1.1 },
};

const DIGITS = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];

/** 75 → 七十五, 10 → 十, 20 → 二十. */
export function cantonese(n) {
  if (n < 10) return DIGITS[n];
  const tens = Math.floor(n / 10);
  const units = n % 10;
  return (tens === 1 ? '' : DIGITS[tens]) + '十' + (units ? DIGITS[units] : '');
}

/** The digits one by one, the way a caller repeats them: 75 → 七五, 20 → 二零. */
export function spelt(n) {
  return String(n).split('').map((d) => DIGITS[+d]).join('');
}

/** B I N G O for a 75-ball game; nothing for 90. */
export function letterFor(n, pool) {
  if (pool !== 75) return '';
  return 'BINGO'[Math.floor((n - 1) / 15)];
}

/** The call itself: "B，十二號，一二！" */
export function callLine(n, { pool, letters }) {
  const letter = letters ? letterFor(n, pool) : '';
  const head = letter ? `${letter}，` : '';
  const repeat = n <= 10 ? `${cantonese(n)}！` : `${spelt(n)}！`;
  return `${head}${cantonese(n)}號，${repeat}`;
}

// Homophones every Hongkonger at a banquet table already knows.
export const QUIPS = {
  1: '一心一意，等緊你 Bingo！',
  2: '好事成雙！',
  3: '三，生生猛猛！',
  4: '四？大吉利是，當我冇講過！',
  5: '五，唔使驚，慢慢嚟！',
  6: '六六無窮，福祿滿堂！',
  7: '七彩繽紛，今晚好熱鬧！',
  8: '八！發！發！發！',
  9: '九，長長久久！',
  10: '十全十美！',
  11: '十一，兩條腿，跑得快！',
  12: '十二，實易！今鋪實易中！',
  13: '十三，實生！生意興隆！',
  14: '十四……實死？唔好咁講，實得！',
  15: '十五，月亮圓圓！',
  16: '十六，實祿！',
  18: '十八，實發！有冇人即刻發咗？',
  19: '十九，實久！',
  22: '二十二，兩隻鴨仔游下水！',
  23: '二十三，易生！',
  28: '二十八，易發！好意頭！',
  33: '三十三，生生世世！',
  38: '三十八，咪望住隔籬呀，冇講你！',
  40: '四十，男人四十一枝花！',
  44: '四十四，嗱，唔准諗歪！',
  48: '四十八，世發！一世都發！',
  50: '五十，半百喇，加油！',
  54: '五十四，唔死！好嘢！',
  58: '五十八，我發！你發！大家發！',
  66: '六十六，六六大順！',
  68: '六十八，一路發！',
  69: '六十九，倒轉都一樣！',
  75: '七十五，最後嗰粒喇！',
  77: '七十七，雙七，好運到！',
  80: '八十，八十歲都要玩揼波拿！',
  88: '八十八，發發！雙發！',
  90: '九十，最大嗰粒！',
};

export const HELPER_DRAW = [
  '抽到喇！',
  '嚟喇嚟喇！',
  '新鮮出爐！',
  '呢粒熱辣辣！',
  '睇清楚呀！',
  '出咗喇！',
  '龍哥，呢粒！',
];

// Said between numbers when the room needs a nudge.
export const BANTER = [
  '大家睇清楚張卡呀，唔好掛住食嘢！',
  '仲有冇人未搵到筆？舉手！',
  '手指郁快啲，唔好瞓著呀！',
  '邊位已經差一個？舉手俾我睇吓！',
  '隔籬嗰位，唔好偷睇人張卡呀！',
  '飲啖茶，抖抖氣，繼續！',
  '今晚最大獎，可能就係你！',
  '抽波嘅助手手勢好好喎，畀啲掌聲！',
  '我只係講一次……好啦，講兩次，好心。',
  '有冇人張卡一個都未中？唔好喊，仲有機會！',
  '好緊張呀，我手心都出汗喇！',
  '記住，叫 Bingo 要大聲，細聲唔計！',
];

export const OPENING = [
  '各位朋友，歡迎嚟到譚仔揼波拿夜！攞好你張卡同支筆，我哋即刻開波！',
  '大家好！今晚由我主持揼波拿，規矩好簡單：聽號碼，畫卡，夠一條線就大聲叫 Bingo！',
];

export const MILESTONE = (n, left) => `已經抽咗${cantonese(n)}個號碼，仲剩${cantonese(left)}個！`;

export const CLAIM = [
  '有人叫 Bingo！大家停一停，等我哋核對吓！',
  '嘩！有人 Bingo 喎！助手，過去睇吓張卡！',
];

export const CLAIM_GOOD = [
  '恭喜晒！真係 Bingo！大家畀啲掌聲！',
  '核對完畢，係真嘅！恭喜恭喜！',
];

export const CLAIM_BAD = [
  '哎呀，未得呀！假 Bingo，罰唱一首歌！',
  '唔好意思，仲未齊喎！大家繼續，遊戲照玩！',
];

export const RESUME = '好，我哋繼續！';

export const pick = (list) => list[Math.floor(Math.random() * list.length)];
