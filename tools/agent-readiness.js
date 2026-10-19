// 에이전트 준비도 셀프 진단 — 채점 로직 (브라우저/Node 공용, 외부 전송 없음)
(function (root) {
  const AREAS = [
    { id: "reproduce", name: "재현성", hint: "같은 상태를 다시 만들 수 있는가",
      first: "버그·테스트 상황을 명령 한 줄로 재현하는 스크립트부터 만드세요. 시드 고정, 고정 테스트 데이터, 외부 API 응답 녹화(스텁)가 출발점입니다.",
      qs: ["테스트 데이터나 시드를 고정해서, 같은 입력이면 같은 결과가 나온다",
           "버그를 문서가 아니라 명령(스크립트) 한 줄로 재현할 수 있다",
           "외부 API·시간·난수 의존성을 테스트에서 고정(스텁·목)할 수 있다"] },
    { id: "command", name: "명령화", hint: "작업이 명령·API로 정리돼 있는가",
      first: "사람이 관리자 화면에서만 하는 작업 상위 3개를 골라 CLI나 API로 노출하세요. 에이전트가 만질 수 없는 작업은 자동화할 수 없습니다.",
      qs: ["주요 운영 작업을 관리자 화면 없이 CLI·API·스크립트로 할 수 있다",
           "상태 변경이 기록(감사 로그·이벤트)으로 남는다",
           "그 기록을 그대로 다시 실행(재생)해서 상황을 재현할 수 있다"] },
    { id: "config", name: "설정 분리", hint: "설정·데이터가 코드 밖에 있는가",
      first: "자주 바뀌는 값(임계값·문구·가격·규칙)을 코드 밖 설정 파일로 빼고 버전 관리하세요. 배포 없이 실험할 수 있어야 반복이 빨라집니다.",
      qs: ["임계값·문구·가격·규칙 같은 값이 코드에 하드코딩돼 있지 않다",
           "설정을 바꿀 때 재빌드·재배포가 필요 없다",
           "설정 변경 이력이 버전 관리되고 쉽게 되돌릴 수 있다"] },
    { id: "headless", name: "헤드리스", hint: "화면 없이 돌릴 수 있는가",
      first: "핵심 로직을 UI·브라우저 없이 실행하는 진입점(CLI·테스트 하네스)을 만드세요. 그래야 에이전트가 사람의 화면을 뺏지 않고 병렬로 일합니다.",
      qs: ["핵심 로직을 UI·브라우저 없이 실행할 수 있다",
           "같은 환경을 여러 벌 동시에 띄워도 서로 간섭하지 않는다",
           "로컬이나 CI에서 사람 개입 없이 처음부터 끝까지 돌릴 수 있다"] },
    { id: "measure", name: "수치 평가", hint: "결과를 숫자로 판정할 수 있는가",
      first: "가장 중요한 작업 하나에 통과/실패를 코드가 판정하는 검사를 붙이세요. 판정 기준이 없으면 에이전트가 '됐다'고 말할 근거가 없습니다. 보통 여기부터 시작합니다.",
      qs: ["작업 결과의 성공/실패를 판정하는 자동 테스트나 지표가 있다",
           "성능·품질 결과가 대시보드뿐 아니라 CSV·JSON·로그로도 나온다",
           "변경 전후를 같은 기준으로 비교한 수치를 남긴다"] },
  ];
  const ORDER = ["measure", "reproduce", "command", "config", "headless"]; // 권장 착수 순서

  function score(answers) { // answers: 15개, 각 0(아니오)/1(부분)/2(예)
    if (!Array.isArray(answers) || answers.length !== 15) throw new Error("15개 답이 필요합니다");
    const areas = AREAS.map((a, i) => {
      const s = answers.slice(i * 3, i * 3 + 3).reduce((x, y) => x + Number(y), 0);
      return { id: a.id, name: a.name, score: s, max: 6, pct: Math.round((s / 6) * 100) };
    });
    const total = areas.reduce((x, a) => x + a.score, 0);
    const pct = Math.round((total / 30) * 100);
    const minArea = Math.min(...areas.map(x => x.score));
    // L4는 총점 80% 이상 + 모든 영역 4/6 이상일 때만 (한 영역이 비면 위임 불가)
    const level = pct >= 80 && minArea >= 4 ? { key: "L4", name: "에이전트 위임 가능", desc: "에이전트가 스스로 만들고, 돌리고, 판정할 수 있는 상태입니다. 범위를 넓히는 단계입니다." }
      : pct >= 55 ? { key: "L3", name: "부분 자율", desc: "정해진 작업은 맡길 수 있지만, 판정이나 재현에 사람이 자주 끼어듭니다." }
      : pct >= 30 ? { key: "L2", name: "보조 수준", desc: "에이전트가 초안은 만들지만 검증·실행은 사람이 합니다. 기반 정비가 효과가 큰 단계입니다." }
      : { key: "L1", name: "준비 전", desc: "에이전트가 시스템을 보거나 만질 방법이 거의 없습니다. 작은 판정 기준 하나부터 시작하세요." };
    // 가장 약한 영역 2개 (동점이면 권장 착수 순서 우선)
    const weakest = areas.filter(a => a.score < 6).sort((a, b) => a.score - b.score || ORDER.indexOf(a.id) - ORDER.indexOf(b.id)).slice(0, 2)
      .map(a => ({ ...a, first: AREAS.find(x => x.id === a.id).first }));
    return { total, max: 30, pct, level, areas, weakest };
  }
  const api = { AREAS, score };
  if (typeof module !== "undefined") module.exports = api; else root.AgentReadiness = api;
})(this);
