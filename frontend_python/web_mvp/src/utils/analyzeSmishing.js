const PATTERNS = {
  link: ["bit.ly", "http", "https", "hxxp", "[.]", ".click", ".site", ".xyz", "링크"],
  urgent: ["긴급", "즉시", "오늘", "압류", "정지", "반송"],
  money: ["결제", "송금", "상품권", "계좌", "납부"],
  family: ["엄마", "아빠", "폰 고장", "번호 바뀜"],
  delivery: ["택배", "우체국", "대한통운", "배송지"],
  institution: ["건강보험", "경찰", "검찰", "법원", "은행", "카드"],
  privacy: ["인증번호", "비밀번호", "주민등록번호", "카드번호"],
};

const includesAny = (text, terms) => terms.filter((term) => text.includes(term));

const clampScore = (score) => Math.max(0, Math.min(100, score));

const getRiskLevel = (score) => {
  if (score >= 70) return "위험";
  if (score >= 40) return "주의";
  return "낮음";
};

const getImpersonationType = (matches) => {
  if (matches.privacy.length > 0) return "개인정보 탈취형";
  if (matches.family.length > 0) return "가족 사칭형";
  if (matches.delivery.length > 0) return "택배 사칭형";
  if (matches.institution.length > 0) return "기관/금융 사칭형";
  return "정상 문자 가능성";
};

const buildFamilyCheckMessage = (riskLevel, impersonationType) =>
  `확인 부탁해요. 이 문자는 ${riskLevel} 단계의 위험 가능성이 있고, 유형은 ${impersonationType}으로 보여요. 문자 안의 링크 열기, 송금, 개인정보 입력은 하지 않고 기존에 알고 있던 연락 방법으로 먼저 확인하려고 합니다.`;

const buildDecoderExplanation = ({ riskLevel, impersonationType, suspiciousEvidence }) => {
  const evidenceSummary = suspiciousEvidence.slice(0, 2).join(" ");

  if (riskLevel === "위험") {
    return `스미싱 가능성이 높아요. 첫번째, ${impersonationType}에서 자주 보이는 표현이 포함되어 있습니다. 두번째, ${evidenceSummary} 세번째, 사용자를 급하게 움직이게 만들어 문자 안의 링크 열기, 송금, 개인정보 입력을 유도할 수 있습니다.`;
  }

  if (riskLevel === "주의") {
    return `스미싱 가능성을 더 확인해볼 필요가 있어요. 첫번째, 문자 안에 일부 의심 표현이 있습니다. 두번째, ${evidenceSummary} 세번째, 발신자와 요청 내용이 평소와 다르면 피해로 이어질 수 있습니다.`;
  }

  return `스미싱이 아닐 가능성이 높아요. 첫번째, 문자 내용이 일상적인 대화 흐름에 가깝습니다. 두번째, 현재 문자에는 의심스러운 링크나 전화번호 유도 표현이 뚜렷하게 보이지 않습니다. 세번째, 송금이나 개인정보 입력을 급하게 요구하는 표현도 강하게 나타나지 않습니다. 다만`;
};

export const exampleMessages = [
  {
    label: "택배 사칭 예시",
    text: "택배 배송지가 확인되지 않아 반송 예정입니다. 오늘 안에 배송지를 확인해 주세요. hxxp://delivery-check[.]site",
  },
  {
    label: "가족 사칭 예시",
    text: "엄마 나 폰 고장이라 번호 바뀜. 급해서 상품권으로 먼저 보내줘.",
  },
  {
    label: "기관 사칭 예시",
    text: "건강보험 납부 내역 확인이 필요합니다. 즉시 본인 인증번호를 입력해 주세요.",
  },
  {
    label: "정상 문자 가능성",
    text: "회의 자료 확인했습니다. 오후에 다시 이야기해요.",
  },
];

export function analyzeSmishing(inputText) {
  const text = inputText.trim();

  if (!text) {
    const suspiciousEvidence = ["검사할 문자 내용을 입력하면 의심 요인을 확인할 수 있습니다."];
    const riskLevel = "낮음";
    const impersonationType = "정상 문자 가능성";

    return {
      inputText: "",
      riskScore: 0,
      riskLevel,
      impersonationType,
      suspiciousEvidence,
      recommendedActions: ["의심되는 문자는 링크를 누르기 전에 발신자를 먼저 확인하세요."],
      familyCheckMessage: buildFamilyCheckMessage(riskLevel, impersonationType),
      explanation: buildDecoderExplanation({ riskLevel, impersonationType, suspiciousEvidence }),
      highlightedTerms: [],
      factorScores: [
        { label: "링크 유도", score: 0 },
        { label: "긴급성", score: 0 },
        { label: "금전 요구", score: 0 },
        { label: "개인정보 요구", score: 0 },
      ],
    };
  }

  const matches = Object.fromEntries(
    Object.entries(PATTERNS).map(([key, terms]) => [key, includesAny(text, terms)]),
  );

  let score = 12;
  const suspiciousEvidence = [];

  if (matches.link.length > 0) {
    score += 24;
    suspiciousEvidence.push("외부 링크 또는 짧은 주소로 이동을 유도합니다.");
  }

  if (matches.urgent.length > 0) {
    score += 18;
    suspiciousEvidence.push("빠른 행동을 요구하는 긴급 표현이 포함되어 있습니다.");
  }

  if (matches.money.length > 0) {
    score += 20;
    suspiciousEvidence.push("결제, 송금, 납부 등 금전 행동을 유도하는 표현이 있습니다.");
  }

  if (matches.family.length > 0) {
    score += 18;
    suspiciousEvidence.push("가족을 사칭해 연락처 변경이나 급한 요청을 하는 흐름입니다.");
  }

  if (matches.delivery.length > 0) {
    score += 12;
    suspiciousEvidence.push("배송 문제를 이유로 확인 행동을 요구합니다.");
  }

  if (matches.institution.length > 0) {
    score += 14;
    suspiciousEvidence.push("기관 또는 금융사를 언급해 신뢰를 유도합니다.");
  }

  if (matches.privacy.length > 0) {
    score += 24;
    suspiciousEvidence.push("인증번호나 비밀번호 등 민감정보 입력을 요구할 가능성이 있습니다.");
  }

  if (suspiciousEvidence.length === 0) {
    suspiciousEvidence.push("링크, 송금, 개인정보 입력을 강하게 요구하는 표현은 뚜렷하게 보이지 않습니다.");
  }

  const riskScore = clampScore(score);
  const riskLevel = getRiskLevel(riskScore);
  const impersonationType = getImpersonationType(matches);
  const highlightedTerms = Object.values(matches).flat();

  return {
    inputText: text,
    riskScore,
    riskLevel,
    impersonationType,
    suspiciousEvidence,
    recommendedActions: [
      "문자 안의 링크나 첨부파일을 열지 마세요.",
      "송금이나 결제 요청은 먼저 멈추고 기존에 알고 있던 연락처로 확인하세요.",
      "인증번호, 비밀번호, 카드번호는 문자에 적힌 입력창에 넣지 마세요.",
      "기관이나 업체 안내처럼 보이면 공식 앱, 공식 홈페이지, 대표 고객센터처럼 직접 확인할 수 있는 채널을 이용하세요.",
    ],
    familyCheckMessage: buildFamilyCheckMessage(riskLevel, impersonationType),
    explanation: buildDecoderExplanation({ riskLevel, impersonationType, suspiciousEvidence }),
    highlightedTerms,
    factorScores: [
      { label: "링크 유도", score: matches.link.length > 0 ? 85 : 15 },
      { label: "긴급성", score: matches.urgent.length > 0 ? 72 : 20 },
      { label: "금전 요구", score: matches.money.length > 0 ? 80 : 16 },
      { label: "개인정보 요구", score: matches.privacy.length > 0 ? 88 : 18 },
    ],
  };
}
