import { BookOpen } from "lucide-react";
import { guideTypes } from "../data/staticContent";
import { panelClass, SectionTitle } from "../components/mvp/ui.jsx";

export function GuidePage({ warm }) {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <SectionTitle icon={BookOpen} subtitle="Safety Guide" title="스미싱 완전 가이드" warm={warm} />
      {guideTypes.map(([type, description, example]) => (
        <div className={panelClass(warm, "p-6")} key={type}>
          <h3 className="text-xl font-black">{type}</h3>
          <p className="mt-2 leading-7 text-slate-600">{description}</p>
          <p className="mt-3 rounded-xl bg-white p-3 text-sm font-bold leading-6 text-slate-600">예시: {example}</p>
        </div>
      ))}
    </div>
  );
}
