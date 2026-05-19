import { useState } from "react"; // useState 추가
import { Flag, Send, CheckCircle2 } from "lucide-react";
import { panelClass, SectionTitle } from "../components/mvp/ui.jsx";
import { REPORT_PAGE_TEXT, REPORT_TYPES } from "../constants.js";

export function ReportPage({ reportText, reportType, setReportText, setReportType, warm }) {
  const visibleReportTypes = REPORT_TYPES.includes(reportType) ? REPORT_TYPES : [reportType, ...REPORT_TYPES];

  return (
    <div className="mx-auto max-w-3xl">
      <div className={panelClass(warm, "p-8")}>
        <SectionTitle icon={Flag} subtitle={REPORT_PAGE_TEXT.subtitle} title={REPORT_PAGE_TEXT.title} warm={warm} />
        <p className="mt-4 text-lg font-bold leading-8 text-slate-600">
          {REPORT_PAGE_TEXT.description}
        </p>
        <label className="mt-6 block" htmlFor="report-type">
          <span className="text-sm font-black text-slate-600">{REPORT_PAGE_TEXT.typeLabel}</span>
          <select
            className="mt-2 w-full rounded-2xl border-2 border-slate-200 bg-white p-4 font-bold"
            id="report-type"
            value={reportType}
            onChange={(event) => setReportType(event.target.value)}
          >
            {visibleReportTypes.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </label>
        <label className="mt-4 block" htmlFor="report-message">
          <span className="text-sm font-black text-slate-600">{REPORT_PAGE_TEXT.messageLabel}</span>
          <textarea
            className="mt-2 min-h-48 w-full rounded-2xl border-2 border-slate-200 bg-white p-4 leading-7"
            id="report-message"
            value={reportText}
            onChange={(event) => setReportText(event.target.value)}
            placeholder={REPORT_PAGE_TEXT.messagePlaceholder}
          />
        </label>
        <button
          className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-red-600 font-black text-white disabled:bg-slate-300"
          disabled
          type="button"
        >
          <Send className="h-5 w-5" />
          {REPORT_PAGE_TEXT.submitButton}
        </button>
      </div>
    </div>
  );
}
