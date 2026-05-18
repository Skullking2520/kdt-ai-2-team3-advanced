import { analyzeSmishing, exampleMessages } from "../utils/analyzeSmishing";
import { PREDICT_API_URL } from "../utils/API_URL";
export { exampleMessages };

function normalizeApiResult(result, message) {
  const fallback = analyzeSmishing(message);

  return {
    ...fallback,
    ...result,
    analysisSource: "backend",
    backendError: null,
    suspiciousEvidence: result?.suspiciousEvidence?.length
      ? result.suspiciousEvidence
      : fallback.suspiciousEvidence,
    recommendedActions: result?.recommendedActions?.length
      ? result.recommendedActions
      : fallback.recommendedActions,
    explanation: result?.explanation || fallback.explanation,
    familyCheckMessage:
      result?.familyCheckMessage || fallback.familyCheckMessage,
  };
}

export async function predictSmishing({ message, allowTrainingUse }) {
  try {
    const response = await fetch(PREDICT_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ message, allowTrainingUse }),
    });

    if (!response.ok)
      throw new Error(`Smishing API failed: ${response.status}`);

    const result = await response.json();
    return normalizeApiResult(result, message);
  } catch (error) {
    return {
      ...analyzeSmishing(message),
      analysisSource: "fallback",
      backendError:
        error instanceof Error ? error.message : "Smishing API request failed",
    };
  }
}
