import { useState } from "react";
import { EmptyState, riskVisual } from "../components/mvp/ui.jsx";
import { RESULT_PAGE_TEXT } from "../constants.js";

export function ResultPage({ copyState, hasResult, message, onBack, onCopy, onReport, result, warm }) {
  const [feedback, setFeedback] = useState("");
  const [feedbackDetail, setFeedbackDetail] = useState("");

  if (!hasResult) return <EmptyState onBack={onBack} warm={warm} />;

  const visual = riskVisual(result.riskLevel);
  // 결과 화면은 백엔드 응답을 정규화한 배열만 순회하고 별도 판정 로직을 넣지 않습니다.
  const categories = result.categories ?? [];
  const reasons = result.reasons ?? [];
  const recommendations = result.recommendations ?? [];

  const feedbackPanel = (
    <section className={warm ? "rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-lg shadow-amber-100/60" : "mt-6 rounded-3xl border border-slate-200 bg-white p-5"}>
      <h2 className={warm ? "mb-4 text-2xl font-black" : "text-xl font-black text-slate-950"}>{RESULT_PAGE_TEXT.feedbackTitle}</h2>
      <div className="mt-4 flex flex-wrap gap-3">
        <button className="min-h-11 rounded-2xl bg-slate-950 px-5 font-black text-white" onClick={() => { setFeedback("agree"); setFeedbackDetail(""); }} type="button">{RESULT_PAGE_TEXT.feedbackAgreeButton}</button>
        <button className="min-h-11 rounded-2xl border border-slate-200 bg-white px-5 font-black text-slate-800" onClick={() => setFeedback("disagree")} type="button">{RESULT_PAGE_TEXT.feedbackDisagreeButton}</button>
      </div>
      {feedback === "disagree" && (
        <div className="mt-4 grid gap-2">
          {RESULT_PAGE_TEXT.feedbackOptions.map((option) => (
            <button
              className={`rounded-2xl border px-4 py-3 text-left text-sm font-bold ${feedbackDetail === option ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700"}`}
              key={option}
              onClick={() => setFeedbackDetail(option)}
              type="button"
            >
              {option}
            </button>
          ))}
        </div>
      )}
      {(feedback === "agree" || feedbackDetail) && <p className="mt-3 text-sm font-bold text-slate-500">{RESULT_PAGE_TEXT.feedbackThanks}</p>}
    </section>
  );

  if (!warm) {
    return (
      <div className="mx-auto max-w-6xl">
        <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-200/70">
          <div className="border-b border-slate-200 bg-slate-50 px-6 py-5 sm:px-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-black text-slate-500">{RESULT_PAGE_TEXT.reportEyebrow}</p>
                <h1 className="mt-1 text-3xl font-black text-slate-950">{RESULT_PAGE_TEXT.reportTitle}</h1>
              </div>
              <span className={`rounded-full px-5 py-2 text-sm font-black ${visual.text} ${visual.panel}`}>{result.riskLevel}</span>
            </div>
          </div>

          <div className="grid gap-0 lg:grid-cols-[1fr_22rem]">
            <div className="p-6 sm:p-8">
              <div className="rounded-3xl border border-slate-200 bg-white p-5">
                <p className="text-sm font-black text-slate-500">{RESULT_PAGE_TEXT.targetMessageTitle}</p>
                <p className="mt-3 max-h-32 overflow-auto whitespace-pre-wrap text-base font-bold leading-7 text-slate-800">
                  {message}
                </p>
              </div>

              <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200">
                <div className="grid grid-cols-[9rem_1fr] border-b border-slate-200 bg-slate-50 text-sm font-black text-slate-500">
                  <div className="px-5 py-4">{RESULT_PAGE_TEXT.tableHeaderItem}</div>
                  <div className="px-5 py-4">{RESULT_PAGE_TEXT.tableHeaderContent}</div>
                </div>
                {[
                  [RESULT_PAGE_TEXT.riskScoreLabel, `${result.riskScore}/100`],
                  [RESULT_PAGE_TEXT.riskLevelLabel, result.riskLevel],
                  [RESULT_PAGE_TEXT.categoriesLabel, categories.join(", ")],
                ].map(([label, value]) => (
                  <div className="grid grid-cols-[9rem_1fr] border-b border-slate-100 last:border-b-0" key={label}>
                    <div className="bg-slate-50 px-5 py-4 text-sm font-black text-slate-500">{label}</div>
                    <div className="px-5 py-4 text-base font-black text-slate-900">{value}</div>
                  </div>
                ))}
              </div>

              <section className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <h2 className="text-xl font-black text-slate-950">{RESULT_PAGE_TEXT.summaryTitle}</h2>
                <p className="mt-3 text-base font-bold leading-7 text-slate-700">{result.summary}</p>
              </section>

              <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5">
                <h2 className="text-xl font-black text-slate-950">{RESULT_PAGE_TEXT.evidenceTitle}</h2>
                <div className="mt-4 divide-y divide-slate-100">
                  {reasons.map((item, index) => (
                    <div className="grid gap-3 py-4 sm:grid-cols-[4rem_1fr]" key={item}>
                      <span className="text-sm font-black text-slate-400">{String(index + 1).padStart(2, "0")}</span>
                      <p className="text-base font-bold leading-7 text-slate-700">{item}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5">
                <h2 className="text-xl font-black text-slate-950">{RESULT_PAGE_TEXT.recommendationsTitle}</h2>
                <div className="mt-4 divide-y divide-slate-100">
                  {recommendations.map((item, index) => (
                    <div className="grid gap-3 py-4 sm:grid-cols-[4rem_1fr]" key={item}>
                      <span className="text-sm font-black text-slate-400">{String(index + 1).padStart(2, "0")}</span>
                      <p className="text-base font-bold leading-7 text-slate-700">{item}</p>
                    </div>
                  ))}
                </div>
              </section>

              {feedbackPanel}
            </div>

            <aside className="border-t border-slate-200 bg-slate-50 p-6 lg:border-l lg:border-t-0 sm:p-8">
              <div className="rounded-3xl bg-white p-5 shadow-sm">
                <p className="text-sm font-black text-slate-500">{RESULT_PAGE_TEXT.totalScoreTitle}</p>
                <p className={`mt-3 text-5xl font-black ${visual.text}`}>{result.riskScore}</p>
                <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
                  <div className={`h-full ${visual.bar}`} style={{ width: `${result.riskScore}%` }} />
                </div>
                <p className={`mt-4 text-base font-black ${visual.text}`}>{visual.headline}</p>
              </div>

              <div className="mt-4 rounded-3xl bg-white p-5 shadow-sm">
                <p className="text-sm font-black text-slate-500">{RESULT_PAGE_TEXT.quickActionsTitle}</p>
                <div className="mt-4 grid gap-3">
                  <button className="min-h-12 rounded-2xl bg-red-600 px-4 font-black text-white" onClick={onReport} type="button">{RESULT_PAGE_TEXT.reportButton}</button>
                  <button className="min-h-12 rounded-2xl bg-slate-950 px-4 font-black text-white" onClick={onCopy} type="button">{copyState === "copied" ? RESULT_PAGE_TEXT.copyDoneButton : RESULT_PAGE_TEXT.shareButton}</button>
                  <button className="min-h-12 rounded-2xl border border-slate-200 bg-white px-4 font-black text-slate-800" onClick={onBack} type="button">{RESULT_PAGE_TEXT.retryButton}</button>
                </div>
                {copyState === "failed" && <p className="mt-3 text-sm font-bold text-red-600">{RESULT_PAGE_TEXT.copyFailedMessage}</p>}
              </div>
            </aside>
          </div>
        </section>

        <p className="mt-5 px-2 text-center text-sm font-bold leading-6 text-slate-500">
          {RESULT_PAGE_TEXT.aiDisclaimer}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className={`rounded-3xl border-2 p-8 ${visual.panel}`}>
        <h2 className={`text-3xl font-black ${visual.text}`}>{RESULT_PAGE_TEXT.riskLevelPrefix}: {result.riskLevel}</h2>
        <div className="mt-4 flex items-center justify-between text-lg font-black"><span>{RESULT_PAGE_TEXT.riskScoreLabel}</span><span>{result.riskScore}/100</span></div>
        <div className="mt-2 h-4 overflow-hidden rounded-full bg-white"><div className={`h-full ${visual.bar}`} style={{ width: `${result.riskScore}%` }} /></div>
        <p className={`mt-4 text-lg font-bold ${visual.text}`}>{visual.headline}</p>
      </div>
      <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-lg shadow-amber-100/60"><h3 className="mb-4 text-2xl font-black">{RESULT_PAGE_TEXT.summaryTitle}</h3><p className="text-base font-bold leading-8 text-slate-700">{result.summary}</p></section>
      <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-lg shadow-amber-100/60"><h3 className="mb-4 text-2xl font-black">{RESULT_PAGE_TEXT.categoriesTitle}</h3><p className="text-2xl font-black text-slate-950">{categories.join(", ")}</p></section>
      <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-lg shadow-amber-100/60"><h3 className="mb-4 text-2xl font-black">{RESULT_PAGE_TEXT.evidenceTitle}</h3>{reasons.map((item, i) => <div className="mb-3 flex gap-3 rounded-2xl bg-white p-4 leading-7" key={item}><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-500 text-sm font-black text-white">{i + 1}</span><span className="font-bold text-slate-700">{item}</span></div>)}</section>
      <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-lg shadow-amber-100/60"><h3 className="mb-4 text-2xl font-black">{RESULT_PAGE_TEXT.recommendationsTitle}</h3>{recommendations.map((item, i) => <div className="mb-3 flex gap-3 rounded-2xl bg-white p-4 leading-7" key={item}><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500 text-sm font-black text-white">{i + 1}</span><span className="font-bold text-slate-700">{item}</span></div>)}</section>
      {feedbackPanel}
      <div className="grid gap-3 sm:grid-cols-3">
        <button className="min-h-14 rounded-2xl bg-red-600 px-4 text-lg font-black text-white" onClick={onReport} type="button">{RESULT_PAGE_TEXT.reportButton}</button>
        <button className="min-h-14 rounded-2xl bg-slate-950 px-4 text-lg font-black text-white" onClick={onCopy} type="button">{copyState === "copied" ? RESULT_PAGE_TEXT.copyDoneButton : RESULT_PAGE_TEXT.shareButton}</button>
        <button className="min-h-14 rounded-2xl border bg-white px-4 text-lg font-black" onClick={onBack} type="button">{RESULT_PAGE_TEXT.retryButton}</button>
      </div>
      {copyState === "failed" && <p className="text-base font-bold text-red-600">{RESULT_PAGE_TEXT.copyFailedMessage}</p>}
      <p className="px-2 text-center text-base font-bold leading-7 text-slate-500">
        {RESULT_PAGE_TEXT.aiDisclaimer}
      </p>
    </div>
  );
}
