// 필드 상수 (1280x720 고정 캔버스)
export const FIELD = {
  W: 1280, H: 720,
  GROUND_Y: 660,
  FLOOR_H: 48,
  BUILDING_W: 110,
  LANES: 11,
  LANE_X: (i) => 40 + i * 112,
};

// ── 곡선 모델 ──────────────────────────────────────────────
// 난이도는 fallSpeed나 층수가 아니라 "압박률"로 설계한다.
//   압박률 = 웨이브 총 HP / (기준 플레이어가 그 웨이브 동안 낼 수 있는 클릭 수)
//   1.0 = 기준 실력이 딱 감당 가능. 1.0을 넘으면 피해가 누적된다.
// 이렇게 하면 층수·속도·수량을 따로 만지지 않고 난이도를 한 축으로 잡을 수 있다.
export const TUNE = {
  refClickRate: 4, // 기준 플레이어 클릭 속도(회/초)

  fallSpeedBase: 200,
  fallSpeedGrowth: 1.035,

  countBase: 1,
  countPerWaves: 3,
  countMax: 8,

  floorsBase: 2,
  floorsPerWaves: 4,
  floorsMax: 7,

  pressureBase: 0.55,
  pressureGrowth: 0.05,
  pressureMax: 2.2,

  spawnStagger: 1.2,
  intermission: 1.5,
  hpFloorWeight: 0.5, // 위층이 무거워지는 정도 (아래가 낮고 위가 높다)
  hpJitter: 0.22,     // 건물별 HP 편차 +-22%. 런마다 결과가 달라지게 하는 유일한 원천
  bottomDestroyAccel: 1.4,
  cityHpStart: 10,
  minwonPainThreshold: 3,
};

export function waveSpec(n) {
  const fallSpeed = TUNE.fallSpeedBase * Math.pow(TUNE.fallSpeedGrowth, n - 1);
  const count = Math.min(
    TUNE.countBase + Math.floor((n - 1) / TUNE.countPerWaves),
    TUNE.countMax, FIELD.LANES
  );
  const maxFloors = Math.min(
    TUNE.floorsBase + Math.floor((n - 1) / TUNE.floorsPerWaves),
    TUNE.floorsMax
  );
  const fallTime = FIELD.GROUND_Y / fallSpeed;
  const duration = TUNE.spawnStagger * (count - 1) + fallTime;
  const pressure = Math.min(
    TUNE.pressureBase + TUNE.pressureGrowth * (n - 1),
    TUNE.pressureMax
  );
  const totalHp = TUNE.refClickRate * duration * pressure;
  return {
    wave: n, fallSpeed, count, maxFloors, pressure,
    totalHp, hpPerBuilding: totalHp / count,
    stagger: TUNE.spawnStagger,
  };
}

// 용도 태그는 총 HP를 바꾸지 않고 "형태"만 바꾼다.
// 예산은 유지하면서 전술적 다양성만 얻는 방식.
export const USE_SHAPE = {
  주거: { floorBias: 0, label: '아파트' },        // 기본형
  상업: { floorBias: -1, label: '치킨집·노래방' }, // 낮고 두껍다
  종교: { floorBias: +2, label: '교회 첨탑' },     // 높고 얇다 = 위에서 깎으면 오래 걸림
  공공: { floorBias: -1, label: '주민센터' },      // 낮고 두껍다
};

// 목표 HP를 층에 배분한다. 아래층이 가볍고 위층이 무겁다.
// -> 밑을 치면 빨리 줄지만 가속 페널티, 위를 치면 안전하지만 단단하다.
export function distributeHp(floorCount, hpTarget) {
  const w = [];
  for (let i = 0; i < floorCount; i++) w.push(1 + i * TUNE.hpFloorWeight);
  const sum = w.reduce((a, c) => a + c, 0);
  return w.map((x) => Math.max(1, Math.round((hpTarget * x) / sum)));
}
