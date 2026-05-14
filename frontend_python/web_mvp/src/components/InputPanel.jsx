import { ClipboardCheck, ClipboardPaste, RefreshCw } from "lucide-react";
import { StepCard } from "./StepCard";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";
import { Textarea } from "./ui/Input";

const pasteMessage = {
  pasted: "클립보드의 문자 내용을 붙여넣었습니다.",
  empty: "클립보드에 붙여넣을 문자가 없습니다.",
  failed: "붙여넣기 권한을 사용할 수 없습니다. 입력창에 직접 붙여넣어 주세요.",
};

export function InputPanel({
  allowTrainingUse,
  currentPrototype,
  exampleMessages,
  message,
  onAllowTrainingUseChange,
  onAnalyze,
  onExample,
  onMessageChange,
  onPaste,
  onReset,
  pasteState,
  selectedPrototype,
}) {
  const PrototypeIcon = currentPrototype.icon;
  const isSenior = selectedPrototype === "senior";
  const isBasic = selectedPrototype === "basic";
  const controlSize = isSenior ? "large" : "default";
  const processSteps = isBasic
    ? ["문자 검사", "가족 확인", "상세 분석"]
    : ["문자를 붙여넣기", "검사하기 누르기", "링크는 멈추기"];

  return (
    <Card as="section" className="p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${currentPrototype.iconClass}`}
        >
          <PrototypeIcon className="h-6 w-6" aria-hidden="true" />
        </div>
        <div>
          <p className="text-sm font-black text-slate-500">{currentPrototype.name}</p>
          <h2 className={`${isSenior ? "text-3xl" : "text-2xl"} mt-1 font-black leading-tight`}>
            {currentPrototype.title}
          </h2>
          <p className={`${isSenior ? "text-lg" : "text-sm"} mt-3 leading-7 text-slate-600`}>
            {currentPrototype.summary}
          </p>
        </div>
      </div>

      {(isSenior || isBasic) && (
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {processSteps.map((step, index) => (
            <StepCard key={step} number={String(index + 1)} text={step} />
          ))}
        </div>
      )}

      <div className="mt-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className={`${isSenior ? "text-xl" : "text-base"} font-black`} htmlFor="message-input">
            문자 내용
          </label>
          <button
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 text-sm font-black text-blue-800 transition hover:bg-blue-100 focus:outline-none focus:ring-4 focus:ring-blue-100"
            onClick={onPaste}
            type="button"
          >
            <ClipboardPaste className="h-4 w-4" aria-hidden="true" />
            붙여넣기
          </button>
        </div>
        <Textarea
          className={`mt-3 ${
            isSenior ? "min-h-64 text-xl leading-9" : "min-h-48 text-base leading-7"
          }`}
          id="message-input"
          onChange={(event) => onMessageChange(event.target.value)}
          placeholder="검사할 문자 내용을 입력하거나 붙여넣어 주세요."
          value={message}
        />
        {pasteState !== "idle" && (
          <p className="mt-2 text-sm font-bold text-slate-600">{pasteMessage[pasteState]}</p>
        )}
      </div>

      <label className="mt-4 flex gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-left">
        <input
          checked={allowTrainingUse}
          className="mt-1 h-5 w-5 shrink-0 accent-blue-700"
          onChange={(event) => onAllowTrainingUseChange(event.target.checked)}
          type="checkbox"
        />
        <span>
          <span className="block text-sm font-black text-slate-800">
            입력한 문자 내용은 개인정보를 제거한 뒤, 스미싱 탐지 모델 성능 개선에 활용될 수 있습니다.
          </span>
          <span className="mt-1 block text-xs font-bold leading-5 text-slate-500">
            동의하지 않아도 검사는 가능하며, 언제든 체크를 해제할 수 있습니다.
          </span>
        </span>
      </label>

      <div className="mt-5">
        <p className={`${isSenior ? "text-lg" : "text-sm"} mb-3 font-black text-slate-700`}>
          예시 문자
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {exampleMessages.map((example) => (
            <button
              className={`rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-left font-bold text-slate-700 transition hover:border-blue-700 hover:bg-blue-50 ${
                isSenior ? "min-h-16 text-lg" : "min-h-14 text-sm"
              }`}
              key={example.label}
              onClick={() => onExample(example.text)}
              type="button"
            >
              {example.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Button onClick={onAnalyze} size={controlSize}>
          <ClipboardCheck className="h-5 w-5" aria-hidden="true" />
          검사하기
        </Button>
        <Button onClick={onReset} size={controlSize} variant="secondary">
          <RefreshCw className="h-5 w-5" aria-hidden="true" />
          다시 검사하기
        </Button>
      </div>
    </Card>
  );
}
