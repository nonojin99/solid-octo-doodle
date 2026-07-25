// 클래스 = 아키타입 1개 + 자연 제한 1개.
// 기본 공격에는 쿨다운이 없다. 연사 속도는 플레이어의 클릭 속도 그 자체.
// 각 클래스는 쿨다운이 아닌 서로 다른 종류의 천장을 갖는다.
export const CLASSES = {
  chulgeo: {
    id: 'chulgeo',
    name: '철거반장 김두철',
    kind: 'strike',
    dmg: 1,
    limit: '없음 — 순수 클릭 속도 (기준선)',
  },
  johap: {
    id: 'johap',
    name: '재개발 조합장',
    kind: 'buyout', // 건물 즉시 소멸. 맨손 대체 공격 없음 = 자금이 곧 제한
    fundsStart: 120,
    fundsRegen: 9,
    fundsMax: 300,
    costPerHp: 4,      // 매입가 = 건물 총 HP x 8 (층수 과금이면 후반에 공짜가 됨)
    refundPerFloor: 3,
    limit: '자금 — 큰 건물일수록 사실상 긴 쿨다운',
  },
  dosa: {
    id: 'dosa',
    name: '무허가 도사',
    kind: 'talisman', // 60% 폭발(지정층+아래층) / 20% 저주 / 20% 불발
    boomDmg: 1,
    dudChance: 0.28,
    curseChance: 0.2,
    curseDps: 1.0,
    curseDur: 4,
    limit: '불발 20% — 연타해도 5번에 1번은 날아감',
  },
  bunyeo: {
    id: 'bunyeo',
    name: '아파트 부녀회장',
    kind: 'noise', // 스택당 DoT + 낙하 감속
    dotDps: 0.35,
    dotDur: 6,
    slowMaxStacks: 5,
    limit: '스택 상한 5 — 한 채에 몰아쳐도 천장이 있어 분산 강제',
  },
};

export const CLASS_IDS = Object.keys(CLASSES);
