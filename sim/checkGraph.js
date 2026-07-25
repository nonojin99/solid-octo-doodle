import { SKILLS, TRAITS } from '../logic/skills.js';
import { CLASSES } from '../logic/classes.js';
import { createRun, step } from '../logic/engine.js';
import { makeBot } from './bot.js';

// H-TEST 3: 언락 무결성
let fail = 0;
const ok = (cond, msg) => { console.log(`  ${cond ? 'PASS' : 'FAIL'}  ${msg}`); if (!cond) fail++; };

console.log('\n[언락 그래프]');
// 순환 참조 / 고립 노드 / 도달 가능성
for (const s of Object.values(SKILLS)) {
  const seen = new Set();
  let cur = s.prereq;
  let cyclic = false;
  while (cur) {
    if (seen.has(cur)) { cyclic = true; break; }
    seen.add(cur);
    cur = SKILLS[cur]?.prereq;
  }
  if (cyclic) { console.log(`  FAIL  순환 참조: ${s.id}`); fail++; }
}
ok(Object.values(SKILLS).every((s) => !s.prereq || SKILLS[s.prereq]), '모든 선행조건이 존재하는 노드를 가리킴');
ok(Object.values(SKILLS).filter((s) => !s.prereq).length === 3, '루트 노드 3개 (파괴/통제/잡기술)');
ok(Object.values(SKILLS).every((s) => {
  let d = 0, cur = s.prereq;
  while (cur) { d++; cur = SKILLS[cur].prereq; }
  return d === s.tier - 1;
}), 'tier 값과 선행 깊이 일치');

const skillCost = Object.values(SKILLS).reduce((a, c) => a + c.cost, 0);
const traitCost = Object.values(TRAITS).reduce((a, c) => a + c.cost, 0);
const classCost = 300 + 600 + 900;
const total = skillCost + traitCost + classCost;
console.log(`\n[고철 총량]`);
console.log(`  스킬 ${skillCost} + 특성 ${traitCost} + 클래스 ${classCost} = 총 ${total} 고철 필요`);

// 런당 획득 고철 측정
let sum = 0;
const N = 200;
for (let s = 1; s <= N; s++) {
  const r = createRun({ seed: s * 7919, classId: 'chulgeo', skills: [] });
  const bot = makeBot({ clickRate: 4 });
  while (!r.over && r.wave <= 80 && r.t < 1200) { bot(r); step(r); }
  sum += r.scrap;
}
const per = sum / N;
const runs = total / per;
console.log(`  런당 평균 획득: ${per.toFixed(0)} 고철  ->  전체 언락에 약 ${runs.toFixed(0)}런`);
ok(runs >= 15 && runs <= 60, `전체 언락 소요 런 수가 15~60 범위 (실측 ${runs.toFixed(0)})`);

console.log(`\n${fail === 0 ? '언락 무결성 전체 PASS' : `FAIL ${fail}건`}\n`);
