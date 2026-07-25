import { FIELD, TUNE, distributeHp, USE_SHAPE } from './waveConfig.js';

// 용도 태그. 무명행의 계열 필드 아이디어만 이식한 것 (내용은 무관).
export const USE_TAGS = ['주거', '상업', '종교', '공공'];

export function makeBuilding(id, lane, spec, rng) {
  const use = rng.pick(USE_TAGS);
  const bias = USE_SHAPE[use].floorBias;
  const floorCount = Math.max(1, Math.min(1 + rng.int(spec.maxFloors) + bias, TUNE.floorsMax));
  // 층수는 용도별로 다르지만 HP 총량은 웨이브 예산을 따른다 (층수가 적으면 층당 HP가 두껍다)
  const jitter = 1 + (rng.next() * 2 - 1) * TUNE.hpJitter;
  const floors = distributeHp(floorCount, spec.hpPerBuilding * jitter);
  return {
    id,
    lane,
    x: FIELD.LANE_X(lane),
    use,
    floors, // index 0 = 최하층
    bottomY: 0, // 선행 엣지. 화면 최상단에서 출발
    baseSpeed: spec.fallSpeed,
    accel: 1, // 최하층 파괴 시 누적 가속
    slowStacks: 0, // 부녀회장 소음
    dots: [], // {dps, remain}
    age: 0,
    alive: true,
  };
}

export const totalHp = (b) => b.floors.reduce((a, c) => a + c, 0);
export const heightOf = (b) => b.floors.length * FIELD.FLOOR_H;
export const topY = (b) => b.bottomY - heightOf(b);

export function speedOf(b, globalSlow) {
  const slow = (1 - 0.15 * Math.min(b.slowStacks, 5)) * globalSlow;
  return b.baseSpeed * b.accel * Math.max(slow, 0.1);
}

export function timeToGround(b, globalSlow) {
  const v = speedOf(b, globalSlow);
  return v <= 0 ? Infinity : (FIELD.GROUND_Y - b.bottomY) / v;
}

// 클릭 좌표 -> 층 index. 렌더 좌표계와 동일 식을 쓴다 (H-TEST 히트박스 조건).
export function floorAt(b, y) {
  const idx = Math.floor((b.bottomY - y) / FIELD.FLOOR_H);
  return idx >= 0 && idx < b.floors.length ? idx : -1;
}

// 층에 피해. 반환: 파괴된 층 수
export function damageFloor(b, idx, dmg) {
  if (!b.alive || idx < 0 || idx >= b.floors.length) return 0;
  b.floors[idx] -= dmg;
  if (b.floors[idx] > 0) return 0;
  const wasBottom = idx === 0;
  b.floors.splice(idx, 1);
  // 최하층이 사라지면 상층부는 분리되지 않고 통째로 가속 낙하한다.
  if (wasBottom) b.accel *= TUNE.bottomDestroyAccel;
  if (b.floors.length === 0) b.alive = false;
  return 1;
}
