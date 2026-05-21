import { EXAMPLE_MESSAGES } from "../constants.js";

export const exampleMessages = EXAMPLE_MESSAGES;

// 과거 규칙 기반 fallback이 실수로 재연결되면 테스트에서 바로 드러나도록 막아둡니다.
export function analyzeSmishing() {
  throw new Error("Frontend heuristic analysis is disabled. Render backend API responses only.");
}
