import { analyzeSmishing, exampleMessages } from "../utils/analyzeSmishing";

export { exampleMessages };

const API_URL = import.meta.env.VITE_SMISHING_API_URL ?? "http://localhost:8000/predict";

function normalizeApiResult(result, message) {
  const fallback = analyzeSmishing(message);

  return {
    ...fallback,
    ...result,
    analysisSource: "backend",
    backendError: null,
    suspiciousEvidence: result?.suspiciousEvidence?.length ? result.suspiciousEvidence : fallback.suspiciousEvidence,
    recommendedActions: result?.recommendedActions?.length ? result.recommendedActions : fallback.recommendedActions,
    explanation: result?.explanation || fallback.explanation,
    familyCheckMessage: result?.familyCheckMessage || fallback.familyCheckMessage,
  };
}

export async function predictSmishing({ message, allowTrainingUse }) {
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, allowTrainingUse }),
    });

    if (!response.ok) throw new Error(`Smishing API failed: ${response.status}`);

    const result = await response.json();
    return normalizeApiResult(result, message);
  } catch (error) {
    return {
      ...analyzeSmishing(message),
      analysisSource: "fallback",
      backendError: error instanceof Error ? error.message : "Smishing API request failed",
    };
  }
}
