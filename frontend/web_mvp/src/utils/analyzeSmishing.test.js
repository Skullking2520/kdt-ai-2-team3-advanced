import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { analyzeSmishing, exampleMessages } from "./analyzeSmishing.js";

describe("analyzeSmishing", () => {
  test("does not run frontend heuristic analysis", () => {
    assert.throws(() => analyzeSmishing("택배 주소 확인 http://..."), /disabled/);
  });

  test("keeps two UI examples only", () => {
    assert.equal(exampleMessages.length, 2);
    assert.deepEqual(exampleMessages.map((example) => example.label), ["정상 예시", "스미싱 의심 예시"]);
  });
});
