import { API_ERROR_MESSAGES, EXAMPLE_MESSAGES } from "../constants.js";
import { PREDICT_API_URL } from "../utils/API_URL";
import getCookie from "../utils/getCookie";

export const exampleMessages = EXAMPLE_MESSAGES;

const crsfToken = getCookie("csrftoken");

// 백엔드 필드명이 바뀌어도 화면 컴포넌트는 동일한 구조만 보도록 정규화합니다.
function normalizeApiResult(result) {
  return {
    analysisId: result?.analysisId ?? result?.analysis_id ?? "",
    riskLevel: result?.riskLevel ?? result?.risk_level ?? "",
    riskScore: Number(result?.riskScore ?? result?.risk_score ?? result?.score ?? 0),
    summary: result?.summary ?? result?.explanation ?? "",
    categories: result?.categories ?? (result?.impersonationType ? [result.impersonationType] : []),
    reasons: result?.reasons ?? result?.suspiciousEvidence ?? [],
    recommendations: result?.recommendations ?? result?.recommendedActions ?? [],
  };
}

// API 실패는 호출자가 에러 상태로 처리합니다. 프론트 fallback 분석은 실행하지 않습니다.
export async function predictSmishing({ message, allowTrainingUse }) {
  const response = await fetch(PREDICT_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": crsfToken // 이 헤더 이름으로 토큰을 담아 보냅니다.
    },
    credentials: "include",
    body: JSON.stringify({ message, allowTrainingUse }),
  });

  if (!response.ok) throw new Error(API_ERROR_MESSAGES.requestFailed);

  try {
    const result = await response.json();
    return normalizeApiResult(result);
  } catch {
    throw new Error(API_ERROR_MESSAGES.invalidJson);
  }
}
