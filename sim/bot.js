import { DT, basicAttack, useSkill, timeToGround, globalSlowFactor } from '../logic/engine.js';

// 봇 모델 — 실시간 게임을 헤드리스로 재려면 "사람"을 수치화해야 한다.
// clickRate: 초당 클릭 상한 (평균 4, 숙련 6)
// reactionMs: 새 건물 인지 지연
// policy: 'top' = 최상층부터 (가속 페널티 회피) / 'bottom' = 최하층부터 (빠르지만 가속)
export function makeBot({ clickRate = 4, reactionMs = 250, policy = 'top' } = {}) {
  let budget = 0;
  return function act(r) {
    budget = Math.min(budget + clickRate * DT, 2);
    const gs = globalSlowFactor(r);
    const visible = r.buildings.filter((b) => b.age * 1000 >= reactionMs);
    if (!visible.length) return;

    // 위협도 = 지면 도달까지 남은 시간
    const sorted = visible
      .map((b) => ({ b, ttg: timeToGround(b, gs) }))
      .sort((a, z) => a.ttg - z.ttg);
    const urgent = sorted[0];

    useSkills(r, sorted, urgent);

    // 위협 순서대로 시도하고, 엔진이 거부하면(자금 부족·스택 만렙) 다음 대상으로 넘어간다.
    if (budget >= 1) {
      for (const { b } of sorted) {
        const idx = policy === 'bottom' ? 0 : b.floors.length - 1;
        if (basicAttack(r, b.id, idx)) { budget -= 1; break; }
      }
    }
  };
}

function useSkills(r, sorted, urgent) {
  const n = sorted.length;
  const ttg = urgent.ttg;
  for (let slot = 0; slot < r.skills.length; slot++) {
    if (r.skillCd[slot] > 0 || r.skillCharges[slot] <= 0) continue;
    const id = r.skills[slot];
    let fire = false;
    let target = null;
    switch (id) {
      case 'gangta': case 'pokyak': case 'drill':
        fire = ttg < 2.5; target = urgent.b.id; break;
      case 'balpa':
        fire = n >= 3 && ttg < 3.0; break;
      case 'klaxon': case 'haengjeong':
        fire = n >= 2 && ttg < 2.0; break;
      case 'shield':
        fire = ttg < 1.0; break;
      case 'crane':
        fire = ttg < 1.5; target = urgent.b.id; break;
      case 'chicken':
        fire = r.cityHp <= 5; break;
      case 'gomul': case 'minwon':
        fire = true; break;
      case 'gakseong':
        fire = n >= 3; break;
    }
    if (fire) useSkill(r, slot, target);
  }
}
