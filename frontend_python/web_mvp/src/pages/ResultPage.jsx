import { EmptyState, riskVisual } from "../components/mvp/ui.jsx";

function splitExplanation(text) {
  const markers = ["첫번째", "두번째", "세번째"];
  const positions = markers
    .map((marker) => ({ marker, index: text.indexOf(marker) }))
    .filter((item) => item.index >= 0)
    .sort((a, b) => a.index - b.index);

  if (positions.length === 0) return [{ label: "요약", body: text }];

  const parts = [];
  const summary = text.slice(0, positions[0].index).trim();
  if (summary) parts.push({ label: "요약", body: summary });

  positions.forEach((position, index) => {
    const nextIndex = positions[index + 1]?.index ?? text.length;
    const rawBody = text.slice(position.index + position.marker.length, nextIndex).replace(/^,?\s*/, "").trim();
    if (rawBody) parts.push({ label: position.marker, body: rawBody });
  });

  return parts;
}

function evidenceText(item) {
  return item.replace("AI 판단 결과는 참고용입니다.", "문자 내용만으로는 스미싱 특징이 강하게 보이지 않습니다.");
}

export function ResultPage({ copyState, hasResult, message, onBack, onCopy, onReport, result, warm }) {
  if (!hasResult) return <EmptyState onBack={onBack} warm={warm} />;
  const visual = riskVisual(result.riskLevel);
  const explanationParts = splitExplanation(result.explanation);

  if (!warm) {
    return (
      <div className="mx-auto max-w-6xl">
        <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-200/70">
          <div className="border-b border-slate-200 bg-slate-50 px-6 py-5 sm:px-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-black text-slate-500">분석 리포트</p>
                <h1 className="mt-1 text-3xl font-black text-slate-950">스미싱 문자 판별 결과</h1>
              </div>
              <span className={`rounded-full px-5 py-2 text-sm font-black ${visual.text} ${visual.panel}`}>{result.riskLevel}</span>
            </div>
          </div>

          {result.backendError && (
            <div className="border-b border-amber-200 bg-amber-50 px-6 py-4 text-sm font-bold leading-6 text-amber-900 sm:px-8">
              백엔드 분석 응답을 받지 못해 임시 규칙 기반 분석 결과를 표시합니다. 실제 모델 결과와 다를 수 있습니다.
            </div>
          )}

          <div className="grid gap-0 lg:grid-cols-[1fr_22rem]">
            <div className="p-6 sm:p-8">
              <div className="rounded-3xl border border-slate-200 bg-white p-5">
                <p className="text-sm font-black text-slate-500">분석 대상 메시지</p>
                <p className="mt-3 max-h-32 overflow-auto whitespace-pre-wrap text-base font-bold leading-7 text-slate-800">
                  {message}
                </p>
              </div>

              <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200">
                <div className="grid grid-cols-[9rem_1fr] border-b border-slate-200 bg-slate-50 text-sm font-black text-slate-500">
                  <div className="px-5 py-4">항목</div>
                  <div className="px-5 py-4">내용</div>
                </div>
                {[
                  ["위험 점수", `${result.riskScore}/100`],
                  ["위험 단계", result.riskLevel],
                  ["사칭 유형", result.impersonationType],
                ].map(([label, value]) => (
                  <div className="grid grid-cols-[9rem_1fr] border-b border-slate-100 last:border-b-0" key={label}>
                    <div className="bg-slate-50 px-5 py-4 text-sm font-black text-slate-500">{label}</div>
                    <div className="px-5 py-4 text-base font-black text-slate-900">{value}</div>
                  </div>
                ))}
              </div>

              <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5">
                <h2 className="text-xl font-black text-slate-950">의심 근거</h2>
                <div className="mt-4 divide-y divide-slate-100">
                  {result.suspiciousEvidence.map((item, index) => (
                    <div className="grid gap-3 py-4 sm:grid-cols-[4rem_1fr]" key={item}>
                      <span className="text-sm font-black text-slate-400">{String(index + 1).padStart(2, "0")}</span>
                      <p className="text-base font-bold leading-7 text-slate-700">{evidenceText(item)}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <h2 className="text-xl font-black text-slate-950">AI 상세 설명</h2>
                <p className="mt-2 text-sm font-bold leading-6 text-slate-500">입력한 문자와 판별 결과를 바탕으로 생성된 참고 설명입니다.</p>
                <div className="mt-4 space-y-3">
                  {explanationParts.map((part) => (
                    <div className="rounded-2xl bg-white p-4" key={`${part.label}-${part.body}`}>
                      <p className="text-sm font-black text-sky-600">{part.label}</p>
                      <p className="mt-2 text-base font-bold leading-7 text-slate-700">{part.body}</p>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <aside className="border-t border-slate-200 bg-slate-50 p-6 lg:border-l lg:border-t-0 sm:p-8">
              <div className="rounded-3xl bg-white p-5 shadow-sm">
                <p className="text-sm font-black text-slate-500">종합 점수</p>
                <p className={`mt-3 text-5xl font-black ${visual.text}`}>{result.riskScore}</p>
                <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
                  <div className={`h-full ${visual.bar}`} style={{ width: `${result.riskScore}%` }} />
                </div>
                <p className={`mt-4 text-base font-black ${visual.text}`}>{visual.headline}</p>
                {result.backendError && <p className="mt-3 text-xs font-bold leading-5 text-amber-700">임시 분석 결과</p>}
              </div>

              <div className="mt-4 rounded-3xl bg-white p-5 shadow-sm">
                <p className="text-sm font-black text-slate-500">빠른 작업</p>
                <div className="mt-4 grid gap-3">
                  <button className="min-h-12 rounded-2xl bg-red-600 px-4 font-black text-white" onClick={onReport} type="button">신고하기</button>
                  <button className="min-h-12 rounded-2xl bg-slate-950 px-4 font-black text-white" onClick={onCopy} type="button">{copyState === "copied" ? "복사 완료" : "공유하기"}</button>
                  <button className="min-h-12 rounded-2xl border border-slate-200 bg-white px-4 font-black text-slate-800" onClick={onBack} type="button">다시 검사</button>
                </div>
                {copyState === "failed" && <p className="mt-3 text-sm font-bold text-red-600">클립보드 복사 권한을 확인해주세요.</p>}
              </div>
            </aside>
          </div>
        </section>

        <p className="mt-5 px-2 text-center text-sm font-bold leading-6 text-slate-500">
          AI 판단 결과는 완벽하지 않을 수 있습니다. 조금이라도 의심되면 해당 기관이나 업체의 공식 앱, 공식 홈페이지, 대표 고객센터처럼 직접 확인할 수 있는 채널을 이용하세요.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className={`rounded-3xl border-2 p-8 ${visual.panel}`}>
        <div><h2 className={`text-3xl font-black ${visual.text}`}>위험도: {result.riskLevel}</h2><div className="mt-4 flex items-center justify-between text-lg font-black"><span>위험 점수</span><span>{result.riskScore}/100</span></div><div className="mt-2 h-4 overflow-hidden rounded-full bg-white"><div className={`h-full ${visual.bar}`} style={{ width: `${result.riskScore}%` }} /></div><p className={`mt-4 text-lg font-bold ${visual.text}`}>{visual.headline}</p></div>
      </div>
      <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-lg shadow-amber-100/60"><h3 className="mb-4 text-2xl font-black">사칭 유형</h3><p className="text-2xl font-black text-slate-950">{result.impersonationType}</p></section>
      <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-lg shadow-amber-100/60"><h3 className="mb-4 text-2xl font-black">의심 근거</h3>{result.suspiciousEvidence.map((item, i) => <div className="mb-3 flex gap-3 rounded-2xl bg-white p-4 leading-7" key={item}><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-500 text-sm font-black text-white">{i + 1}</span><span className="font-bold text-slate-700">{evidenceText(item)}</span></div>)}</section>
      <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-lg shadow-amber-100/60">
        <h3 className="mb-4 text-2xl font-black">AI 상세 설명</h3>
        <p className="mb-4 rounded-2xl bg-white px-4 py-3 text-sm font-bold leading-6 text-slate-600">아래 내용은 입력한 문자와 판별 결과를 바탕으로 생성된 참고 설명입니다.</p>
        <div className="space-y-3">
          {explanationParts.map((part) => (
            <div className="grid gap-3 rounded-2xl bg-white p-4 leading-8 text-slate-800 sm:grid-cols-[5.5rem_1fr]" key={`${part.label}-${part.body}`}>
              <span className="inline-flex h-9 w-fit items-center justify-center rounded-full bg-amber-500 px-3 text-sm font-black text-white">{part.label}</span>
              <p className="text-base font-bold">{part.body}</p>
            </div>
          ))}
        </div>
      </section>
      {result.backendError && (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-base font-bold leading-7 text-amber-900">
          백엔드 분석 응답을 받지 못해 임시 규칙 기반 분석 결과를 표시합니다. 실제 모델 결과와 다를 수 있습니다.
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-3">
        <button className="min-h-14 rounded-2xl bg-red-600 px-4 text-lg font-black text-white" onClick={onReport} type="button">신고하기</button>
        <button className="min-h-14 rounded-2xl bg-slate-950 px-4 text-lg font-black text-white" onClick={onCopy} type="button">{copyState === "copied" ? "복사 완료" : "공유하기"}</button>
        <button className="min-h-14 rounded-2xl border bg-white px-4 text-lg font-black" onClick={onBack} type="button">다시 검사</button>
      </div>
      {copyState === "failed" && <p className="text-base font-bold text-red-600">클립보드 복사 권한을 확인해주세요.</p>}
      <p className="px-2 text-center text-base font-bold leading-7 text-slate-500">
        AI 판단 결과는 완벽하지 않을 수 있습니다. 조금이라도 의심되면 해당 기관이나 업체의 공식 앱, 공식 홈페이지, 대표 고객센터처럼 직접 확인할 수 있는 채널을 이용하세요.
      </p>
    </div>
  );
}
