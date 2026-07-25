import { createRun, step } from '../logic/engine.js';
import { TUNE } from '../logic/waveConfig.js';
import { makeBot } from './bot.js';

// 곡선 시작점 스윕. 성장률보다 "초반이 얼마나 공짜인가"가 바닥을 결정한다.
const TARGET = 6.0; // clickRate 4 / 언락 0개 기준
function avgWave(clickRate, seeds = 60) {
  let sum = 0;
  for (let s = 1; s <= seeds; s++) {
    const r = createRun({ seed: s * 7919, classId: 'chulgeo', skills: [] });
    const bot = makeBot({ clickRate });
    while (!r.over && r.wave <= 60 && r.t < 900) { bot(r); step(r); }
    sum += r.wavesCleared;
  }
  return sum / seeds;
}

let best = null;
console.log('\ncountBase cntPerW spdBase floorsBase   avg(4click)');
for (const cb of [1, 2, 3]) {
  for (const cpw of [1, 2]) {
    for (const sb of [90, 130, 170]) {
      for (const fb of [2, 3]) {
        Object.assign(TUNE, { countBase: cb, countPerWaves: cpw, fallSpeedBase: sb, floorsBase: fb });
        const a = avgWave(4);
        const err = Math.abs(a - TARGET);
        if (!best || err < best.err) best = { cb, cpw, sb, fb, a, err };
        if (err < 1.6) console.log(`   ${cb}        ${cpw}       ${sb}       ${fb}          ${a.toFixed(2)}`);
      }
    }
  }
}
console.log(`\n채택: countBase=${best.cb} countPerWaves=${best.cpw} fallSpeedBase=${best.sb} floorsBase=${best.fb} -> ${best.a.toFixed(2)}`);
Object.assign(TUNE, { countBase: best.cb, countPerWaves: best.cpw, fallSpeedBase: best.sb, floorsBase: best.fb });
console.log('\n실력 구간 재측정 (언락 0개)');
for (const cr of [2, 3, 4, 6, 8]) console.log(`  ${cr}클릭/s -> ${avgWave(cr, 120).toFixed(2)}웨이브`);
console.log('');
