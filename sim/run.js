import { createRun, step, DT } from '../logic/engine.js';
import { CLASS_IDS, CLASSES } from '../logic/classes.js';
import { makeBot } from './bot.js';

const arg = (k, d) => {
  const hit = process.argv.find((a) => a.startsWith(`--${k}=`));
  return hit ? hit.split('=')[1] : d;
};

const SEEDS = Number(arg('seeds', 200));
const POLICY = arg('policy', 'top');
const CLICK = Number(arg('clickRate', 4));
const SKILLSET = arg('skills', 'off');
const WAVE_CAP = 60;
const TIME_CAP = 900; // sim seconds

const LOADOUTS = {
  off: [],
  basic: ['gangta', 'klaxon', 'shield'],
  control: ['klaxon', 'shield', 'crane'],
  nuke: ['gangta', 'pokyak', 'drill'],
};

function playOne(seed, classId, skills) {
  const r = createRun({ seed, classId, skills });
  const bot = makeBot({ clickRate: CLICK, policy: POLICY });
  while (!r.over && r.wave <= WAVE_CAP && r.t < TIME_CAP) {
    bot(r);
    step(r);
  }
  return r;
}

const stats = (xs) => {
  const s = xs.slice().sort((a, b) => a - b);
  const q = (p) => s[Math.min(s.length - 1, Math.floor(p * s.length))];
  return {
    avg: xs.reduce((a, c) => a + c, 0) / xs.length,
    med: q(0.5), p10: q(0.1), p90: q(0.9), max: s[s.length - 1],
  };
}; 

const skills = LOADOUTS[SKILLSET];
if (!skills) { console.error(`unknown skillset: ${SKILLSET}`); process.exit(1); }

console.log(`\n낙하공사 밸런스 시뮬  seeds=${SEEDS}  policy=${POLICY}  clickRate=${CLICK}/s  loadout=${SKILLSET}${skills.length ? ` [${skills.join(', ')}]` : ''}`);
console.log('─'.repeat(88));
console.log('클래스              평균웨이브   중간   p10   p90   최고   런길이   민원/런');
console.log('─'.repeat(88));

const results = {};
for (const cid of CLASS_IDS) {
  const waves = [], floors = [], hits = [], times = [];
  for (let s = 1; s <= SEEDS; s++) {
    const r = playOne(s * 7919, cid, skills);
    waves.push(r.wavesCleared);
    floors.push(r.floorsDestroyed);
    hits.push(r.groundHits);
    times.push(r.t);
  }
  const w = stats(waves);
  results[cid] = w;
  const pad = (v, n) => String(v).padStart(n);
  console.log(
    CLASSES[cid].name.padEnd(20) +
    pad(w.avg.toFixed(2), 8) + pad(w.med, 7) + pad(w.p10, 6) + pad(w.p90, 6) + pad(w.max, 7) +
    pad((times.reduce((a, c) => a + c, 0) / SEEDS / 60).toFixed(2) + '분', 10) +
    pad((hits.reduce((a, c) => a + c, 0) / SEEDS).toFixed(2), 10)
  );
}
console.log('─'.repeat(88));

// H-TEST 2: 클래스 편차
const avgs = CLASS_IDS.map((c) => results[c].avg);
const spread = (Math.max(...avgs) - Math.min(...avgs)) / (avgs.reduce((a, c) => a + c, 0) / avgs.length);
console.log(`클래스 편차: ${(spread * 100).toFixed(1)}%  (기준 <=15%)  ${spread <= 0.15 ? 'PASS' : 'FAIL'}`);

// H-TEST 1: 결정성
const a = playOne(4242, 'chulgeo', skills);
const b = playOne(4242, 'chulgeo', skills);
const same = a.wavesCleared === b.wavesCleared && a.floorsDestroyed === b.floorsDestroyed && Math.abs(a.t - b.t) < DT / 2;
console.log(`결정성(동일 시드 재현): ${same ? 'PASS' : 'FAIL'}`);
console.log('');
