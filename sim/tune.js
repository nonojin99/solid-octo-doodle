import { createRun, step } from '../logic/engine.js';
import { CLASSES } from '../logic/classes.js';
import { makeBot } from './bot.js';

// 클래스 파리티 튜너. 철거반장(제한 없음)을 기준선으로 나머지 3클래스의 제한 수치를 맞춘다.
const SEEDS = 150;
const CLICK = 4;

function avgWave(classId, seeds = SEEDS) {
  let sum = 0;
  for (let s = 1; s <= seeds; s++) {
    const r = createRun({ seed: s * 7919, classId, skills: [] });
    const bot = makeBot({ clickRate: CLICK });
    while (!r.over && r.wave <= 80 && r.t < 1200) { bot(r); step(r); }
    sum += r.wavesCleared;
  }
  return sum / seeds;
}

const baseline = avgWave('chulgeo');
console.log(`\n기준선 — 철거반장: ${baseline.toFixed(2)}웨이브\n`);

const KNOBS = {
  johap: { label: '조합장 costPerHp', values: [4.0, 4.4, 4.8, 5.2, 5.6], set: (v) => { CLASSES.johap.costPerHp = v; } },
  dosa: { label: '도사 dudChance', values: [0.22, 0.25, 0.28, 0.31], set: (v) => { CLASSES.dosa.dudChance = v; } },
  bunyeo: { label: '부녀회장 dotDps', values: [0.32, 0.35, 0.38, 0.41], set: (v) => { CLASSES.bunyeo.dotDps = v; } },
};

const chosen = {};
for (const [cid, k] of Object.entries(KNOBS)) {
  console.log(k.label);
  let pick = null;
  for (const v of k.values) {
    k.set(v);
    const a = avgWave(cid, 100);
    const err = Math.abs(a - baseline);
    if (!pick || err < pick.err) pick = { v, a, err };
    console.log(`   ${String(v).padEnd(6)} -> ${a.toFixed(2)}웨이브`);
  }
  k.set(pick.v);
  chosen[cid] = pick;
  console.log(`   채택 ${pick.v} (${pick.a.toFixed(2)})\n`);
}

const finals = [baseline, ...Object.values(chosen).map((p) => p.a)];
const spread = (Math.max(...finals) - Math.min(...finals)) / (finals.reduce((a, c) => a + c, 0) / finals.length);
console.log('최종 적용값');
for (const [cid, p] of Object.entries(chosen)) console.log(`  ${KNOBS[cid].label} = ${p.v}`);
console.log(`\n예상 클래스 편차: ${(spread * 100).toFixed(1)}%  ${spread <= 0.15 ? 'PASS' : 'FAIL'}\n`);
