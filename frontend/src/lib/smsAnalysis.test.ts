import { describe, it, expect } from "vitest";
import { analyzeSms, toLegacyRiskLevel, toSeniorReasons, toSeniorActions, URGENCY_KEYWORDS } from "./smsAnalysis";

describe("analyzeSms — riskLevel 매핑", () => {
  it("가족 사칭 + 상품권 → high", () => {
    const r = analyzeSms("엄마 나 폰 고장나서 번호 바뀌었어. 급하게 상품권 결제 좀 해줘.");
    expect(r.risk_level).toBe("high");
    expect(r.risk_score).toBeGreaterThanOrEqual(90);
    expect(r.smishing_type).toContain("지인");
  });

  it("공공기관 사칭 + 의심 URL → high", () => {
    const r = analyzeSms("【국민건강보험】환급금 확인 http://nhis-refund.kr/check");
    expect(r.risk_level).toBe("high");
    expect(r.risk_score).toBeGreaterThanOrEqual(80);
    expect(r.smishing_type).toContain("사칭");
  });

  it("의심 URL만 (사칭 없음) → medium", () => {
    const r = analyzeSms("http://suspicious-pay.kr/login");
    expect(r.risk_level).toBe("medium");
    expect(r.risk_score).toBeGreaterThanOrEqual(40);
    expect(r.risk_score).toBeLessThan(80);
  });

  it("긴급성 키워드 2개 이상 → medium (긴급성 강조형)", () => {
    const r = analyzeSms("긴급 정지 처리 바랍니다. 즉시 환급 받으세요.");
    expect(r.risk_level).toBe("medium");
    expect(r.smishing_type).toBe("긴급성 강조형");
  });

  it("정상 문자 → low", () => {
    const r = analyzeSms("오늘 점심 같이 먹을래?");
    expect(r.risk_level).toBe("low");
    expect(r.risk_score).toBeLessThan(30);
    expect(r.smishing_type).toBe("정상 문자");
  });
});

describe("analyzeSms — 시그널 플래그", () => {
  it("URL + 사칭 → has_url=true, has_impersonation=true", () => {
    const r = analyzeSms("【국민건강보험】http://nhis-pay.kr/check");
    expect(r.has_url).toBe(true);
    expect(r.has_impersonation).toBe(true);
  });

  it("상품권 언급 → has_payment_request=true", () => {
    const r = analyzeSms("상품권 결제 부탁드립니다");
    expect(r.has_payment_request).toBe(true);
  });

  it("주민번호 언급 → has_personal_info_request=true", () => {
    const r = analyzeSms("주민번호 입력해주세요");
    expect(r.has_personal_info_request).toBe(true);
  });

  it("비어있는 입력 → 모든 시그널 false", () => {
    const r = analyzeSms("안녕하세요");
    expect(r.has_url).toBe(false);
    expect(r.has_impersonation).toBe(false);
    expect(r.has_payment_request).toBe(false);
    expect(r.has_personal_info_request).toBe(false);
  });
});

describe("analyzeSms — 유사 사례", () => {
  it("high → 3건", () => {
    const r = analyzeSms("엄마 나 폰 고장나서 번호 바뀌었어. 급하게 상품권 결제 좀 해줘.");
    expect(r.similar_cases.length).toBe(3);
  });

  it("medium (긴급성) → 2건", () => {
    const r = analyzeSms("긴급 정지 즉시 환급");
    expect(r.similar_cases.length).toBe(2);
  });

  it("low → 0건", () => {
    const r = analyzeSms("안녕하세요");
    expect(r.similar_cases.length).toBe(0);
  });
});

describe("analyzeSms — URL 추출", () => {
  it("URL 추출 정확", () => {
    const r = analyzeSms("여기 보세요: http://example.com/path?q=1");
    expect(r.url).toBe("http://example.com/path?q=1");
  });

  it("URL 없으면 null", () => {
    const r = analyzeSms("URL 없는 일반 텍스트");
    expect(r.url).toBeNull();
  });
});

describe("toLegacyRiskLevel 어댑터", () => {
  it("high → danger", () => {
    expect(toLegacyRiskLevel("high")).toBe("danger");
  });
  it("medium → warning", () => {
    expect(toLegacyRiskLevel("medium")).toBe("warning");
  });
  it("low → normal", () => {
    expect(toLegacyRiskLevel("low")).toBe("normal");
  });
});

describe("toSeniorReasons / toSeniorActions 매핑", () => {
  it("정식 한국어를 시니어 어투로 변환", () => {
    const formal = ["가족이나 지인을 사칭하는 표현이 포함되어 있습니다."];
    const senior = toSeniorReasons(formal);
    expect(senior[0]).toBe("가족을 사칭하는 표현이 있습니다.");
  });

  it("매핑에 없는 텍스트는 그대로 반환", () => {
    const unmapped = ["알 수 없는 사유"];
    expect(toSeniorReasons(unmapped)).toEqual(["알 수 없는 사유"]);
    expect(toSeniorActions(unmapped)).toEqual(["알 수 없는 사유"]);
  });
});

describe("URGENCY_KEYWORDS — SeniorAnalyzer '긁' 오타 제거 검증", () => {
  it("'긴급' 포함", () => {
    expect(URGENCY_KEYWORDS).toContain("긴급");
  });
  it("'긁' 미포함 (오타 제거 확인)", () => {
    expect(URGENCY_KEYWORDS).not.toContain("긁");
  });
  it("12개 키워드", () => {
    expect(URGENCY_KEYWORDS.length).toBe(12);
  });
});
