import { LoaderCircle } from "lucide-react";

import { exampleMessages } from "../services/smishingService";
import { pasteMessage } from "../data/staticContent";
import { panelClass } from "../components/mvp/ui.jsx";
import { CHECK_PAGE_TEXT, FORM_LIMITS } from "../constants.js";

export function CheckForm({
  allowTrainingUse,
  analysisError,
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
            aria-label={CHECK_PAGE_TEXT.ariaLabel}
            className="min-h-48 w-full resize-y rounded-t-[1.6rem] border-0 bg-transparent px-5 py-5 text-base font-bold leading-7 text-slate-800 outline-none placeholder:text-slate-400"
            maxLength={FORM_LIMITS.messageMaxLength}
            value={message}
            onChange={(event) => onMessageChange(event.target.value)}
            placeholder={CHECK_PAGE_TEXT.compactPlaceholder}
          />
          <div className="flex min-h-16 flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-5 py-3 rounded-b-[1.6rem]">
            <span className="text-sm font-black text-slate-400">{message.length}/{FORM_LIMITS.messageMaxLength}</span>
            <div className="flex items-center gap-2">
              <button
                className="min-h-11 rounded-full border border-slate-200 bg-white px-5 text-sm font-black text-slate-500"
                onClick={onPaste}
                type="button"
              >
                {CHECK_PAGE_TEXT.pasteButton}
              </button>
              <button
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-sky-500 px-6 text-sm font-black text-white disabled:bg-slate-200"
                disabled={!message.trim() || isAnalyzing}
                onClick={onAnalyze}
                type="button"
              >
                {isAnalyzing && <LoaderCircle className="h-4 w-4 animate-spin" />}
                {isAnalyzing ? CHECK_PAGE_TEXT.compactAnalyzingButton : CHECK_PAGE_TEXT.compactAnalyzeButton}
              </button>
            </div>
          </div>
        </div>
        {pasteState !== "idle" && <p className="mt-3 text-center text-sm font-bold text-slate-500">{pasteMessage[pasteState]}</p>}
        {analysisError && <p className="mt-3 text-center text-sm font-bold text-red-600">{analysisError}</p>}

        <div className="mt-5 flex flex-wrap items-center justify-center gap-3 text-center sm:justify-start sm:text-left">
          <p className="text-base font-black text-slate-400">{CHECK_PAGE_TEXT.examplePrompt}</p>
          <div className="flex flex-wrap justify-center gap-3 sm:justify-start">
            {exampleMessages.map((example) => (
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
          <span>{CHECK_PAGE_TEXT.trainingConsentCompact}</span>
        </label>
      </div>
    );
  }

  return (
    <div className={compact ? "" : "mx-auto max-w-3xl"}>
      <div className={compact ? "rounded-[2rem] border border-slate-200 bg-white p-4 shadow-xl shadow-slate-200/70 sm:p-5" : panelClass(warm, "p-8")}>
        {!compact && (
          <>
            <p className="text-sm font-black text-slate-500">{CHECK_PAGE_TEXT.eyebrow}</p>
            <h2 className="mt-1 text-3xl font-black text-slate-950">{CHECK_PAGE_TEXT.sectionTitle}</h2>
            <p className="mb-6 mt-3 text-lg leading-8 text-slate-600">{CHECK_PAGE_TEXT.sectionDescription}</p>
          </>
        )}


        <div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <label className="text-sm font-black text-slate-500">{CHECK_PAGE_TEXT.messageLabel}</label>
            <button
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700"
              onClick={onPaste}
              type="button"
            >
              {CHECK_PAGE_TEXT.pasteButton}
            </button>
          </div>
          <textarea
            className={`w-full resize-y rounded-3xl border-2 bg-white px-5 py-4 text-lg leading-8 outline-none ${warm ? "border-amber-300 focus:border-amber-500 focus:ring-4 focus:ring-amber-100" : "border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"} ${compact ? "min-h-40" : "min-h-44"}`}
            value={message}
            onChange={(event) => onMessageChange(event.target.value)}
            placeholder={CHECK_PAGE_TEXT.messagePlaceholder}
          />
          {pasteState !== "idle" && <p className="mt-2 text-sm font-bold text-slate-500">{pasteMessage[pasteState]}</p>}
          {analysisError && <p className="mt-2 text-sm font-bold text-red-600">{analysisError}</p>}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {exampleMessages.map((example) => (
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
            <span className="block text-sm font-black">{CHECK_PAGE_TEXT.trainingConsentTitle}</span>
            {CHECK_PAGE_TEXT.trainingConsentDescription && <span className="mt-1 block text-xs font-bold text-slate-500">{CHECK_PAGE_TEXT.trainingConsentDescription}</span>}
          </span>
        </label>

        <button
          className={`mt-5 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl text-lg font-black text-white shadow-lg disabled:bg-slate-300 ${warm ? "bg-amber-500" : "bg-indigo-600"}`}
          disabled={!message.trim() || isAnalyzing}
          onClick={onAnalyze}
          type="button"
        >
          {isAnalyzing && <LoaderCircle className="h-5 w-5 animate-spin" />}
          {isAnalyzing ? CHECK_PAGE_TEXT.analyzingButton : CHECK_PAGE_TEXT.analyzeButton}
        </button>
      </div>
    </div>
  );
}

export function CheckPage(props) {
  return <CheckForm {...props} />;
}
