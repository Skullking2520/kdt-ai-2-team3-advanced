import { ChevronLeft, FileText, MessageSquareText } from "lucide-react";

export function AnalyzerSection({
  activePage,
  children,
  hasAnalyzed,
  onSelectPage,
}) {
  return (
    <section className="border-y border-stone-200 bg-[#f7f2ea]" id="analyzer">
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-black text-blue-800">AI Message Check</p>
            <h2 className="mt-1 text-3xl font-black text-slate-950">문자를 넣고, 결과 안내를 따로 확인합니다</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              입력 화면과 결과 화면을 나눠서 디지털 정보 취약계층도 한 단계씩 확인할 수 있게 구성했습니다.
            </p>
          </div>
          <div className="grid w-full max-w-md grid-cols-2 rounded-lg border border-stone-200 bg-white p-1 shadow-[var(--shadow-card)]">
            <button
              className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-3 text-sm font-black transition ${
                activePage === "input" || !hasAnalyzed
                  ? "bg-blue-700 text-white"
                  : "text-slate-600 hover:bg-blue-50"
              }`}
              onClick={() => onSelectPage("input")}
              type="button"
            >
              <MessageSquareText className="h-4 w-4" aria-hidden="true" />
              문자 입력
            </button>
            <button
              className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-3 text-sm font-black transition ${
                activePage === "result" && hasAnalyzed
                  ? "bg-blue-700 text-white"
                  : "text-slate-500 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
              }`}
              disabled={!hasAnalyzed}
              onClick={() => onSelectPage("result")}
              type="button"
            >
              <FileText className="h-4 w-4" aria-hidden="true" />
              결과 안내
            </button>
          </div>
        </div>

        <div className="mt-5">
          {activePage === "result" && hasAnalyzed && (
            <button
              className="mb-4 inline-flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm font-black text-slate-700 transition hover:bg-stone-50"
              onClick={() => onSelectPage("input")}
              type="button"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              문자 다시 수정하기
            </button>
          )}
          {children}
        </div>
      </div>
    </section>
  );
}
