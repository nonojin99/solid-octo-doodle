import { makeRng } from './rng.js';
import { FIELD, TUNE, waveSpec } from './waveConfig.js';
import {
  makeBuilding, damageFloor, timeToGround, speedOf, totalHp, heightOf,
} from './building.js';
import { CLASSES } from './classes.js';
import { SKILLS } from './skills.js';

export const DT = 1 / 60; // 고정 타임스텝. 결정성의 전제.

export function createRun({ seed, classId, skills = [], traits = [] }) {
  const rng = makeRng(seed);
  const cls = CLASSES[classId];
  const has = (t) => traits.includes(t);
  return {
    rng, cls, skills, traits,
    t: 0,
    wave: 0,
    phase: 'intermission',
    phaseT: 0,
    spawnQueue: [],
    buildings: [],
    nextId: 1,
    cityHp: TUNE.cityHpStart + (has('sturdy') ? 2 : 0),
    minwon: 0,
    scrap: has('pocket') ? 50 : 0,
    funds: cls.kind === 'buyout' ? cls.fundsStart : 0,
    dmgMult: has('wrist') ? 1.2 : 1, // 숙련된 손목: 기본 공격 피해 +20%
    skillCd: skills.map(() => 0),
    skillCharges: skills.map((s) => SKILLS[s].charges ?? Infinity),
    globalSlowUntil: 0,
    freezeUntil: 0,
    shield: 0,
    minwonReflect: 0,
    gakseongUntil: 0,
    over: false,
    // 통계
    floorsDestroyed: 0,
    wavesCleared: 0,
    groundHits: 0,
    skillUses: skills.map(() => 0),
    attackAttempts: 0,
  };
}

const globalSlowFactor = (r) => (r.t < r.globalSlowUntil ? 0.6 : 1);
const frozen = (r) => r.t < r.freezeUntil;

function startWave(r) {
  r.wave += 1;
  const spec = waveSpec(r.wave);
  const lanes = r.rng.shuffle([...Array(FIELD.LANES).keys()]).slice(0, spec.count);
  r.spawnQueue = lanes.map((lane, i) => ({ at: r.t + i * spec.stagger, lane, spec }));
  r.phase = 'active';
}

function grantScrap(r, floors) {
  r.scrap += floors * (1 + Math.floor(r.wave / 5));
  if (r.cls.kind === 'buyout') r.funds = Math.min(r.funds + floors * r.cls.refundPerFloor, r.cls.fundsMax);
}

function onGroundHit(r, b) {
  r.groundHits += 1;
  if (r.shield > 0) { r.shield -= 1; return; }
  if (r.minwonReflect > 0) { r.minwonReflect -= 1; r.scrap += 30; return; }
  const extra = r.minwon >= TUNE.minwonPainThreshold ? 1 : 0;
  r.cityHp -= b.floors.length + extra;
  r.minwon += 1;
  if (r.cityHp <= 0) { r.cityHp = 0; r.over = true; r.phase = 'over'; }
}

export function step(r) {
  if (r.over) return;
  r.t += DT;

  // 1. 스폰
  while (r.spawnQueue.length && r.spawnQueue[0].at <= r.t) {
    const q = r.spawnQueue.shift();
    r.buildings.push(makeBuilding(r.nextId++, q.lane, q.spec, r.rng));
  }

  // 2. 낙하 + DoT
  const gs = globalSlowFactor(r);
  const still = frozen(r);
  for (const b of r.buildings) {
    b.age += DT;
    if (!still) b.bottomY += speedOf(b, gs) * DT;
    for (const d of b.dots) {
      d.remain -= DT;
      const killed = damageFloor(b, 0, d.dps * DT);
      if (killed) { r.floorsDestroyed += killed; grantScrap(r, killed); }
    }
    b.dots = b.dots.filter((d) => d.remain > 0 && b.alive);
  }

  // 3. 지면 접촉 / 파괴 정리
  for (const b of r.buildings) {
    if (b.alive && b.bottomY >= FIELD.GROUND_Y) { onGroundHit(r, b); b.alive = false; }
  }
  r.buildings = r.buildings.filter((b) => b.alive);
  if (r.over) return;

  // 4. 쿨다운
  for (let i = 0; i < r.skillCd.length; i++) if (r.skillCd[i] > 0) r.skillCd[i] -= DT;
  if (r.cls.kind === 'buyout') {
    r.funds = Math.min(r.funds + r.cls.fundsRegen * DT, r.cls.fundsMax);
  }

  // 5. 웨이브 전환
  if (r.phase === 'active' && r.spawnQueue.length === 0 && r.buildings.length === 0) {
    r.wavesCleared = r.wave;
    r.phase = 'intermission';
    r.phaseT = r.t + TUNE.intermission;
  } else if (r.phase === 'intermission' && r.t >= r.phaseT) {
    startWave(r);
  }
}

// ---------- 액션 (봇/플레이어 공용 입구) ----------

export function basicAttack(r, buildingId, floorIdx) {
  if (r.over) return false;
  const b = r.buildings.find((x) => x.id === buildingId);
  if (!b || !b.alive) return false;
  const c = r.cls;
  const mult = r.dmgMult * (r.t < r.gakseongUntil ? 2 : 1); // 무면허 각성: 피해 2배
  let killed = 0;

  if (c.kind === 'strike') {
    killed = damageFloor(b, floorIdx, c.dmg * mult);

  } else if (c.kind === 'buyout') {
    // 자금이 곧 제한. 못 사면 클릭 자체가 성립하지 않는다 (맨손 없음).
    const price = totalHp(b) * c.costPerHp;
    if (r.funds < price) return false;
    r.funds -= price;
    killed = b.floors.length;
    b.floors.length = 0;
    b.alive = false;

  } else if (c.kind === 'talisman') {
    const roll = r.rng.next();
    if (roll < c.dudChance) {
      /* 불발 — 클릭은 소모된다 */
    } else if (roll < c.dudChance + c.curseChance) {
      addDot(b, 'curse', c.curseDps * mult, c.curseDur);
    } else {
      killed += damageFloor(b, floorIdx, c.boomDmg * mult);
      killed += damageFloor(b, Math.min(floorIdx, b.floors.length - 1), c.boomDmg * mult);
    }

  } else if (c.kind === 'noise') {
    // 스택 만렙 건물에는 더 쌓을 수 없다 -> 분산 강제
    if (b.slowStacks >= c.slowMaxStacks) return false;
    b.slowStacks += 1;
    addDot(b, 'noise', c.dotDps * b.slowStacks * mult, c.dotDur);
  }

  r.attackAttempts += 1;
  if (killed) { r.floorsDestroyed += killed; grantScrap(r, killed); }
  return true;
}

// 태그가 같은 DoT는 중첩되지 않고 갱신된다 (연타로 DoT를 무한 적층하는 구멍 차단)
function addDot(b, tag, dps, dur) {
  const cur = b.dots.find((d) => d.tag === tag);
  if (cur) { cur.dps = Math.max(cur.dps, dps); cur.remain = dur; }
  else b.dots.push({ tag, dps, remain: dur });
}

export function useSkill(r, slot, targetId = null) {
  if (r.over || slot >= r.skills.length) return false;
  if (r.skillCd[slot] > 0 || r.skillCharges[slot] <= 0) return false;
  const id = r.skills[slot];
  const s = SKILLS[id];
  const target = targetId != null ? r.buildings.find((b) => b.id === targetId) : null;
  let killed = 0;

  switch (id) {
    case 'gangta':
      if (!target) return false;
      killed = damageFloor(target, target.floors.length - 1, 999);
      break;
    case 'pokyak':
      if (!target) return false;
      for (let i = Math.min(2, target.floors.length - 1); i >= 0; i--) killed += damageFloor(target, i, 3);
      break;
    case 'drill':
      if (!target) return false;
      for (let i = target.floors.length - 1; i >= 0; i--) killed += damageFloor(target, i, 2);
      break;
    case 'balpa':
      for (const b of r.buildings) killed += damageFloor(b, 0, 999);
      break;
    case 'klaxon': r.globalSlowUntil = r.t + 5; break;
    case 'shield': r.shield += 1; break;
    case 'crane':
      if (!target) return false;
      target.bottomY = Math.max(target.bottomY - 240, heightOf(target));
      break;
    case 'haengjeong': r.freezeUntil = r.t + 3; break;
    case 'gomul': r.scrap += 40; break;
    case 'chicken': r.cityHp += 2; break;
    case 'minwon': r.minwonReflect += 1; break;
    case 'gakseong': r.gakseongUntil = r.t + 8; break;
    default: return false;
  }

  r.buildings = r.buildings.filter((b) => b.alive);
  if (killed) { r.floorsDestroyed += killed; grantScrap(r, killed); }
  r.skillCd[slot] = s.cd;
  if (r.skillCharges[slot] !== Infinity) r.skillCharges[slot] -= 1;
  r.skillUses[slot] += 1;
  return true;
}

export { timeToGround, totalHp, globalSlowFactor };
