import { Copy, Share2 } from "lucide-react";
import { EmptyState, panelClass, SectionTitle } from "../components/mvp/ui.jsx";

export function SharePage({ copyState, hasResult, onBack, onCopy, result, warm }) {
  if (!hasResult) return <EmptyState onBack={onBack} warm={warm} />;

  return (
    <div className="mx-auto max-w-3xl">
      <div className={panelClass(warm, "p-8")}>
        <SectionTitle icon={Share2} subtitle="Family Check" title="가족/보호자에게 공유" warm={warm} />
        <p className="mt-4 text-lg font-bold leading-8 text-slate-600">
          혼자 판단하기 어려운 문자는 가족이나 보호자에게 바로 확인할 수 있도록 짧은 문구로 정리합니다.
        </p>
        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6">
          <p className="text-lg font-black leading-8 text-slate-800">{result.familyCheckMessage}</p>
        </div>
        <button
          className={`mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl font-black text-white ${warm ? "bg-pink-500" : "bg-purple-600"}`}
          onClick={onCopy}
          type="button"
        >
          <Copy className="h-5 w-5" />
          {copyState === "copied" ? "복사 완료" : "확인 문구 복사하기"}
        </button>
      </div>
    </div>
  );
}
