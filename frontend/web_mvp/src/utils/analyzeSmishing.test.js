import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { analyzeSmishing } from "./analyzeSmishing.js";

describe("analyzeSmishing", () => {
  test("returns decoder-ready explanation and family check message for risky text", () => {
    const result = analyzeSmishing(
      "엄마 나 폰 고장이라 번호 바뀜. 급해서 상품권으로 먼저 보내줘. hxxp://gift-check[.]site",
    );

    assert.equal(result.riskLevel, "위험");
    assert.match(result.explanation, /스미싱 가능성이 높아요/);
    assert.doesNotMatch(result.explanation, /AI 판단 결과는 완벽하지/);
    assert.match(result.familyCheckMessage, /확인/);
  });

  test("returns a cautious low-risk explanation without saying completely safe", () => {
    const result = analyzeSmishing("회의 자료 확인했습니다. 오후에 다시 이야기해요.");

    assert.equal(result.riskLevel, "낮음");
    assert.match(result.explanation, /스미싱이 아닐 가능성이 높아요/);
    assert.match(result.explanation, /첫번째/);
    assert.match(result.explanation, /두번째/);
    assert.match(result.explanation, /세번째/);
    assert.doesNotMatch(result.explanation, /완전히 안전/);
    assert.doesNotMatch(result.explanation, /경로/);
    assert.doesNotMatch(result.suspiciousEvidence.join(" "), /AI 판단 결과는 참고용/);
  });
});
