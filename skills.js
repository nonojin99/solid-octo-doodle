// 액티브 스킬 12종. 런 진입 시 3~4개 선택 -> 키 1~4.
// effect(engine, ctx) 는 engine.js 가 주입한 헬퍼로만 상태를 만진다.
export const SKILLS = {
  // ---- 파괴 ----
  gangta: {
    id: 'gangta', name: '강타', branch: '파괴', tier: 1, cd: 6, cost: 100, prereq: null,
    desc: '지정 층 즉시 파괴',
  },
  pokyak: {
    id: 'pokyak', name: '철거 폭약', branch: '파괴', tier: 2, cd: 12, cost: 200, prereq: 'gangta',
    desc: '하단 3층에 피해 3',
  },
  drill: {
    id: 'drill', name: '관통 드릴', branch: '파괴', tier: 3, cd: 18, cost: 400, prereq: 'pokyak',
    desc: '1채 전층에 피해 2',
  },
  balpa: {
    id: 'balpa', name: '광역 발파', branch: '파괴', tier: 4, cd: 40, cost: 800, prereq: 'drill',
    desc: '화면 내 모든 건물 최하층 파괴',
  },
  // ---- 통제 ----
  klaxon: {
    id: 'klaxon', name: '감속 클랙슨', branch: '통제', tier: 1, cd: 15, cost: 100, prereq: null,
    desc: '5초간 전체 낙하 -40%',
  },
  shield: {
    id: 'shield', name: '지면 방어막', branch: '통제', tier: 2, cd: 20, cost: 200, prereq: 'klaxon',
    desc: '다음 지면 접촉 1회 무효',
  },
  crane: {
    id: 'crane', name: '견인 크레인', branch: '통제', tier: 3, cd: 18, cost: 400, prereq: 'shield',
    desc: '건물 1채를 240px 위로 되돌림',
  },
  haengjeong: {
    id: 'haengjeong', name: '행정 처분', branch: '통제', tier: 4, cd: 45, cost: 800, prereq: 'crane',
    desc: '3초간 완전 정지',
  },
  // ---- 잡기술 ----
  gomul: {
    id: 'gomul', name: '고물상 호출', branch: '잡기술', tier: 1, cd: 25, cost: 100, prereq: null,
    desc: '즉시 고철 +40',
  },
  chicken: {
    id: 'chicken', name: '치킨 배달', branch: '잡기술', tier: 2, cd: 30, cost: 200, prereq: 'gomul',
    charges: 2, desc: '도시 체력 +2 (런당 2회)',
  },
  minwon: {
    id: 'minwon', name: '민원 반사', branch: '잡기술', tier: 3, cd: 30, cost: 400, prereq: 'chicken',
    desc: '다음 접촉 1회를 민원 대신 고철로',
  },
  gakseong: {
    id: 'gakseong', name: '무면허 각성', branch: '잡기술', tier: 4, cd: 50, cost: 800, prereq: 'minwon',
    desc: '8초간 기본 공격 피해 2배',
  },
};

export const SKILL_IDS = Object.keys(SKILLS);

// 영구 패시브 특성
export const TRAITS = {
  wrist: { id: 'wrist', name: '숙련된 손목', cost: 150, desc: '기본 공격 피해 +20%' },
  pocket: { id: 'pocket', name: '뒷주머니', cost: 150, desc: '시작 고철 +50' },
  sorter: { id: 'sorter', name: '폐기물 감별사', cost: 300, desc: '아이템 드롭률 +30%' },
  sturdy: { id: 'sturdy', name: '튼튼한 도시', cost: 400, desc: '도시 체력 +2' },
  slot4: { id: 'slot4', name: '무면허 확장', cost: 1000, desc: '로드아웃 4번째 슬롯' },
};
