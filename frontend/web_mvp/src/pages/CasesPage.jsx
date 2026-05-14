import { TrendingUp } from "lucide-react";
import { recentCases } from "../data/staticContent";
import { panelClass, SectionTitle } from "../components/mvp/ui.jsx";

export function CasesPage({ warm }) {
  return (
    <div className="mx-auto max-w-6xl">
      <SectionTitle icon={TrendingUp} subtitle="Real Cases" title="최근 스미싱 사례" warm={warm} />
      <div className="mt-6 grid gap-5 md:grid-cols-2">
        {recentCases.map(([title, description, keywords], index) => (
          <div className={panelClass(warm, "p-6")} key={title}>
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-orange-100 text-lg font-black text-orange-600">{index + 1}</span>
              <div>
                <h3 className="text-xl font-black">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
                <p className="mt-4 text-sm font-bold text-orange-700">주요 단서: {keywords}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
