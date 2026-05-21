import { AlertCircle, AlertTriangle, CheckCircle2 } from "lucide-react";
import { RISK_LEVEL_TEXT, RISK_VISUAL_TEXT } from "../../constants.js";

export function panelClass(warm, extra = "") {
  return `${extra} rounded-3xl border ${warm ? "border-amber-200 bg-amber-50 shadow-lg shadow-amber-100/60" : "border-slate-200 bg-white shadow-lg shadow-slate-200/60"}`;
}

export function activeClass(warm) {
  return warm ? "bg-amber-500 text-white" : "bg-indigo-600 text-white";
}

export function riskVisual(level) {
  if (level === RISK_LEVEL_TEXT.danger) return { icon: AlertTriangle, panel: "border-red-300 bg-red-50", text: "text-red-700", bar: "bg-red-600", headline: RISK_VISUAL_TEXT.dangerHeadline };
  if (level === RISK_LEVEL_TEXT.warning) return { icon: AlertCircle, panel: "border-amber-300 bg-amber-50", text: "text-amber-700", bar: "bg-amber-500", headline: RISK_VISUAL_TEXT.warningHeadline };
  if (level === RISK_LEVEL_TEXT.lowSuspicion) return { icon: AlertCircle, panel: "border-sky-300 bg-sky-50", text: "text-sky-700", bar: "bg-sky-500", headline: RISK_VISUAL_TEXT.lowSuspicionHeadline };
  return { icon: CheckCircle2, panel: "border-emerald-300 bg-emerald-50", text: "text-emerald-700", bar: "bg-emerald-600", headline: RISK_VISUAL_TEXT.normalHeadline };
}

export function SectionTitle({ icon: Icon, subtitle, title, warm }) {
  return (
    <div className="flex items-center gap-3">
      <span className={`flex h-14 w-14 items-center justify-center rounded-2xl text-white ${warm ? "bg-amber-500" : "bg-indigo-600"}`}>
        <Icon className="h-7 w-7" />
      </span>
      <div>
        <p className="text-sm font-black text-slate-500">{subtitle}</p>
        <h2 className="text-3xl font-black text-slate-950">{title}</h2>
      </div>
    </div>
  );
}

export function Card({ children, icon: Icon, title, warm, className = "" }) {
  return (
    <section className={panelClass(warm, `p-6 ${className}`)}>
      <div className="mb-4 flex items-center gap-2">
        <Icon className={warm ? "h-6 w-6 text-amber-600" : "h-6 w-6 text-indigo-600"} />
        <h3 className="text-2xl font-black">{title}</h3>
      </div>
      {children}
    </section>
  );
}

export function EmptyState({ onBack, warm }) {
  return (
    <div className={panelClass(warm, "mx-auto max-w-xl p-8 text-center")}>
      <p className="text-lg font-black">{RISK_VISUAL_TEXT.emptyMessage}</p>
      <button className={activeClass(warm) + " mt-5 rounded-2xl px-5 py-3 font-black"} onClick={onBack} type="button">{RISK_VISUAL_TEXT.emptyButton}</button>
    </div>
  );
}
