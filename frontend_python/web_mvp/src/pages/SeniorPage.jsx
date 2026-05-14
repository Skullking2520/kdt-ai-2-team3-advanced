import { HeartHandshake } from "lucide-react";
import { riskVisual } from "../components/mvp/ui.jsx";

export function SeniorPage({ result }) {
  const visual = riskVisual(result.riskLevel);
  const Icon = visual.icon;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="rounded-3xl border-4 border-amber-400 bg-white p-8 text-center shadow-xl shadow-amber-100">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-700">
          <HeartHandshake className="h-9 w-9" />
        </div>
        <Icon className={`mx-auto h-20 w-20 ${visual.text}`} />
        <h2 className={`mt-5 text-5xl font-black ${visual.text}`}>{result.riskLevel}</h2>
        <p className="mt-4 text-2xl font-black text-slate-900">위험 점수: {result.riskScore}/100</p>
        <p className="mx-auto mt-4 max-w-xl text-xl font-bold leading-8 text-slate-600">
          글자를 크게 보고, 지금 해야 할 행동만 순서대로 확인할 수 있는 쉬운 화면입니다.
        </p>
        <div className="mt-8 space-y-5">
          {result.recommendedActions.slice(0, 3).map((item, index) => (
            <div className="flex items-center gap-5 rounded-2xl border-2 border-slate-200 p-5 text-left" key={item}>
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-blue-600 text-3xl font-black text-white">{index + 1}</span>
              <span className="text-2xl font-black leading-9 text-slate-800">{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
