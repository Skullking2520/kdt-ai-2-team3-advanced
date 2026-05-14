import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  ClipboardPaste,
  MessageSquareText,
  ShieldAlert,
} from "lucide-react";
import { Button } from "./ui/Button";
import { Textarea } from "./ui/Input";

const pasteMessage = {
  pasted: "클립보드의 문자 내용을 붙여넣었습니다.",
  empty: "클립보드에 붙여넣을 문자가 없습니다.",
  failed: "붙여넣기 권한을 사용할 수 없습니다. 직접 붙여넣어 주세요.",
};

export function HeroSection({
  allowTrainingUse,
  message,
  onAllowTrainingUseChange,
  onAnalyze,
  onMessageChange,
  onPaste,
  pasteState,
  result,
}) {
  return (
    <section className="bg-white" id="top">
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[0.88fr_1.12fr] lg:px-8 lg:py-14">
        <div className="flex flex-col justify-center">
          <div className="mb-5 inline-flex w-fit items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm font-black text-blue-800">
            <ShieldAlert className="h-4 w-4" aria-hidden="true" />
            AI 스미싱 판별 보조 도구
          </div>

          <h1 className="max-w-3xl text-4xl font-black leading-tight tracking-normal text-slate-950 sm:text-5xl">
            가족을 속이는 문자는, 바로 누르기 전에 확인하세요.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
            의심되는 문자 내용을 붙여넣으면 AI가 위험 가능성을 판별하고, 점수와 근거,
            결과 안내, AI 상세 설명을 단계별로 보여줍니다.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-blue-700 px-5 text-base font-black text-white transition hover:bg-blue-800"
              href="#analyzer"
            >
              문자 검사하기
              <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </a>
            <a
              className="inline-flex min-h-12 items-center justify-center rounded-lg border border-slate-300 bg-white px-5 text-base font-black text-slate-700 transition hover:bg-slate-100"
              href="#how-it-works"
            >
              작동 방식 보기
            </a>
          </div>

          <div className="mt-6 flex flex-wrap gap-3 text-sm font-bold text-slate-600">
            <span className="inline-flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
              회원가입 없음
            </span>
            <span className="inline-flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
              개인정보 제거 후 학습 동의
            </span>
            <span className="inline-flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
              참고용 안내
            </span>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 sm:p-5">
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-[var(--shadow-card)]">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-blue-700 text-white">
                <MessageSquareText className="h-6 w-6" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-black text-blue-700">빠른 문자 분석</p>
                <h2 className="mt-1 text-2xl font-black leading-tight text-slate-950">
                  문자 내용을 넣고 바로 확인
                </h2>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <label className="block text-lg font-black text-slate-900" htmlFor="hero-message">
                의심 문자
              </label>
              <button
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 text-sm font-black text-blue-800 transition hover:bg-blue-100 focus:outline-none focus:ring-4 focus:ring-blue-100"
                onClick={onPaste}
                type="button"
              >
                <ClipboardPaste className="h-4 w-4" aria-hidden="true" />
                붙여넣기
              </button>
            </div>
            <Textarea
              className="mt-3 min-h-36 text-lg leading-8"
              id="hero-message"
              onChange={(event) => onMessageChange(event.target.value)}
              placeholder="검사할 문자 내용을 입력하거나 붙여넣어 주세요."
              value={message}
            />
            {pasteState !== "idle" && (
              <p className="mt-2 text-sm font-bold text-slate-600">{pasteMessage[pasteState]}</p>
            )}

            <label className="mt-4 flex gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-left">
              <input
                checked={allowTrainingUse}
                className="mt-1 h-5 w-5 shrink-0 accent-blue-700"
                onChange={(event) => onAllowTrainingUseChange(event.target.checked)}
                type="checkbox"
              />
              <span>
                <span className="block text-sm font-black leading-6 text-slate-800">
                  입력한 문자 내용은 개인정보를 제거한 뒤, 스미싱 탐지 모델 성능 개선에 활용될 수 있습니다.
                </span>
                <span className="mt-1 block text-xs font-bold leading-5 text-slate-500">
                  동의하지 않아도 검사는 가능하며, 언제든 체크를 해제할 수 있습니다.
                </span>
              </span>
            </label>

            <Button className="mt-4" onClick={onAnalyze} size="large">
              <ClipboardCheck className="h-5 w-5" aria-hidden="true" />
              무료로 검사하기
            </Button>

            <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-black text-amber-950">검사 후 결과 안내 화면으로 이동합니다</p>
              <p className="mt-2 text-sm leading-6 text-amber-900">
                AI 판단 결과는 완벽하지 않을 수 있습니다. 조금이라도 의심되면 공식 앱, 공식 홈페이지, 대표 고객센터 번호로 직접 확인하세요.
              </p>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {["문자 입력", "AI 판별", "결과 안내"].map((step, index) => (
                <div className="rounded-lg bg-slate-50 p-3 text-sm font-black text-slate-700" key={step}>
                  <span className="mb-2 flex h-7 w-7 items-center justify-center rounded-full bg-blue-700 text-xs text-white">
                    {index + 1}
                  </span>
                  {step}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
