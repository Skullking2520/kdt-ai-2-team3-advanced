import { exampleMessages } from "../services/smishingService";
import { pasteMessage } from "../data/staticContent";
import { activeClass, panelClass } from "../components/mvp/ui.jsx";

export function CheckForm({
  allowTrainingUse,
  compact = false,
  isAnalyzing,
  message,
  onAllowTrainingUseChange,
  onAnalyze,
  onExample,
  onMessageChange,
  onPaste,
  pasteState,
  warm,
}) {
  if (compact && !warm) {
    return (
      <div className="w-full">
        <div className="rounded-[1.75rem] border-2 border-sky-200 bg-white shadow-sm transition focus-within:border-sky-400 focus-within:shadow-md">
          <textarea
            aria-label="문자 내용"
            className="min-h-48 w-full resize-y rounded-t-[1.6rem] border-0 bg-transparent px-5 py-5 text-base font-bold leading-7 text-slate-800 outline-none placeholder:text-slate-400"
            maxLength={2000}
            value={message}
            onChange={(event) => onMessageChange(event.target.value)}
            placeholder={"문자 내용을 입력하거나 붙여넣어주세요.\n개인정보가 포함된 경우 삭제 후 입력해주세요."}
          />
          <div className="flex min-h-16 items-center justify-between border-t border-slate-100 bg-slate-50 px-5 py-3 rounded-b-[1.6rem]">
            <span className="text-sm font-black text-slate-400">{message.length}/2000</span>
            <button
              className="min-h-11 rounded-full bg-sky-500 px-6 text-sm font-black text-white disabled:bg-slate-200"
              disabled={!message.trim() || isAnalyzing}
              onClick={onAnalyze}
              type="button"
            >
              {isAnalyzing ? "분석중" : "검사"}
            </button>
          </div>
        </div>

        <div className="mt-12 grid gap-5 text-center sm:grid-cols-[0.8fr_1fr] sm:text-left">
          <p className="pt-2 text-base font-black text-slate-400">예시 문자를 눌러보세요</p>
          <div className="flex flex-wrap justify-center gap-3 sm:justify-start">
            {exampleMessages.slice(0, 2).map((example) => (
              <button
                className="rounded-full bg-slate-50 px-5 py-3 text-sm font-black text-slate-400 transition hover:bg-sky-50 hover:text-sky-600 disabled:opacity-60"
                disabled={isAnalyzing}
                key={example.label}
                onClick={() => onExample(example.text)}
                type="button"
              >
                {example.label}
              </button>
            ))}
          </div>
        </div>

        <label className="mx-auto mt-8 flex max-w-2xl items-start gap-3 text-left text-xs font-bold leading-5 text-slate-400">
          <input
            checked={allowTrainingUse}
            className="mt-0.5 h-4 w-4 accent-sky-500"
            onChange={(event) => onAllowTrainingUseChange(event.target.checked)}
            type="checkbox"
          />
          <span>입력한 문자 내용은 개인정보를 제거한 뒤 스미싱 탐지 모델 성능 개선에 활용될 수 있습니다.</span>
        </label>
      </div>
    );
  }

  return (
    <div className={compact ? "" : "mx-auto max-w-3xl"}>
      <div className={compact ? "rounded-[2rem] border border-slate-200 bg-white p-4 shadow-xl shadow-slate-200/70 sm:p-5" : panelClass(warm, "p-8")}>
        {!compact && (
          <>
            <p className="text-sm font-black text-slate-500">Smishing Check</p>
            <h2 className="mt-1 text-3xl font-black text-slate-950">문자 위험 검사</h2>
            <p className="mb-6 mt-3 text-lg leading-8 text-slate-600">의심 문자를 입력하면 AI가 위험 가능성과 대응 방법을 안내합니다.</p>
          </>
        )}


        <div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <label className="text-sm font-black text-slate-500">의심가는 메시지</label>
            <button
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700"
              onClick={onPaste}
              type="button"
            >
              붙여넣기
            </button>
          </div>
          <textarea
            className={`w-full resize-y rounded-3xl border-2 bg-white px-5 py-4 text-lg leading-8 outline-none ${warm ? "border-amber-300 focus:border-amber-500 focus:ring-4 focus:ring-amber-100" : "border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"} ${compact ? "min-h-40" : "min-h-44"}`}
            value={message}
            onChange={(event) => onMessageChange(event.target.value)}
            placeholder="예: 엄마 나 휴대폰 고장났어. 이 번호로 답장해줘..."
          />
          {pasteState !== "idle" && <p className="mt-2 text-sm font-bold text-slate-500">{pasteMessage[pasteState]}</p>}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {exampleMessages.slice(0, 3).map((example) => (
            <button
              className="rounded-full bg-slate-50 px-4 py-2 text-xs font-black text-slate-700 ring-1 ring-slate-200 disabled:opacity-60"
              disabled={isAnalyzing}
              key={example.label}
              onClick={() => onExample(example.text)}
              type="button"
            >
              {example.label}
            </button>
          ))}
        </div>

        <label className="mt-4 flex gap-3 rounded-2xl border border-slate-200 bg-white p-4">
          <input
            checked={allowTrainingUse}
            className={warm ? "mt-1 h-5 w-5 accent-amber-500" : "mt-1 h-5 w-5 accent-indigo-600"}
            onChange={(event) => onAllowTrainingUseChange(event.target.checked)}
            type="checkbox"
          />
          <span>
            <span className="block text-sm font-black">입력한 문자 내용은 개인정보를 제거한 뒤, 스미싱 탐지 모델 성능 개선에 활용될 수 있습니다.</span>
            <span className="mt-1 block text-xs font-bold text-slate-500">동의하지 않아도 검사는 가능하며 언제든 체크를 해제할 수 있습니다.</span>
          </span>
        </label>

        <button
          className={`mt-5 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl text-lg font-black text-white shadow-lg disabled:bg-slate-300 ${warm ? "bg-amber-500" : "bg-indigo-600"}`}
          disabled={!message.trim() || isAnalyzing}
          onClick={onAnalyze}
          type="button"
        >
          {isAnalyzing ? "AI가 분석 중입니다" : "검사하기"}
        </button>
      </div>
    </div>
  );
}

export function CheckPage(props) {
  return <CheckForm {...props} />;
}
