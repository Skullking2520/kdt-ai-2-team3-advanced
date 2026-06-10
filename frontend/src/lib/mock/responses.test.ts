import { describe, it, expect } from "vitest";
import { mockHandle } from "./responses";

/**
 * mockHandle의 invoke 는 직접 접근이 어려우니 (register/invoke 만 노출),
 * api.analyze() 의 mock 경로를 통해 결과를 검증한다.
 * 사실상 lib/api.ts 와 통합 테스트이므로, VITE_USE_MOCK 환경에서만 의미가 있다.
 *
 * 이 테스트는 mock 응답의 기본 도메인 규칙(리스크 레벨, 카드별 필드)만 검증.
 */

describe("mockHandle 라우터 — 등록된 경로", () => {
  it("POST /api/analyze (sms) 등록됨", () => {
    expect(mockHandle.has("/api/analyze", "POST")).toBe(true);
  });

  it("POST /api/ocr 등록됨", () => {
    expect(mockHandle.has("/api/ocr", "POST")).toBe(true);
  });

  it("GET /api/history 등록됨", () => {
    expect(mockHandle.has("/api/history", "GET")).toBe(true);
  });

  it("POST /api/reports 등록됨", () => {
    expect(mockHandle.has("/api/reports", "POST")).toBe(true);
  });

  it("미등록 경로는 false", () => {
    expect(mockHandle.has("/api/UNKNOWN", "GET")).toBe(false);
  });
});

describe("mockHandle.invoke — 분석 결과 shape", () => {
  it("SMS 분석 결과 — 필수 필드 존재", () => {
    const result = mockHandle.invoke<{
      id: string;
      type: "sms";
      riskLevel: "high" | "medium" | "low";
      riskScore: number;
      smishingType: string;
      reasons: unknown[];
      actionGuide: unknown[];
      createdAt: string;
    }>("/api/analyze", "POST", { type: "sms", content: "엄마 폰 고장나서 상품권 결제 좀" });
    expect(result.type).toBe("sms");
    expect(["high", "medium", "low"]).toContain(result.riskLevel);
    expect(typeof result.riskScore).toBe("number");
    expect(result.riskScore).toBeGreaterThanOrEqual(0);
    expect(result.riskScore).toBeLessThanOrEqual(100);
    expect(Array.isArray(result.reasons)).toBe(true);
    expect(Array.isArray(result.actionGuide)).toBe(true);
    expect(result.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("URL 분석 결과 — riskLevel low (안전 도메인)", () => {
    const result = mockHandle.invoke<{ riskLevel: string; urlDetails: { domain: string } }>(
      "/api/analyze",
      "POST",
      { type: "url", content: "https://google.com/" },
    );
    expect(result.riskLevel).toBe("low");
    expect(result.urlDetails.domain).toBe("google.com");
  });

  it("신고 접수 — receiptId 형식", () => {
    const result = mockHandle.invoke<{ receiptId: string; status: string }>(
      "/api/reports",
      "POST",
      { type: "sms", content: "테스트", category: "기타", agreeShare: true },
    );
    expect(result.receiptId).toMatch(/^NB\d{8}-\d{6}$/);
    expect(result.status).toBe("received");
  });
});
