import { HEADER_TEXT } from "../../constants.js";

export function Header({ mode, setMode, warm }) {
  return (
    <header className="sticky top-0 z-30 bg-white">
      <div className="border-b border-slate-100 bg-white">
        <div className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <a className="text-2xl font-black tracking-normal text-slate-900" href="#check">{HEADER_TEXT.brand}</a>

          <nav className="hidden items-center gap-12 text-base font-black text-slate-700 md:flex">
            <a href="#check">{HEADER_TEXT.checkNav}</a>
            <a href="#cases">{HEADER_TEXT.casesNav}</a>
            <a href="#guide">{HEADER_TEXT.guideNav}</a>
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-1 sm:flex">
              <button aria-pressed={mode === "modern"} className={`rounded-xl px-3 py-2 text-sm font-black ${mode === "modern" ? "bg-sky-500 text-white" : "text-slate-600"}`} onClick={() => setMode("modern")} type="button">{HEADER_TEXT.modernMode}</button>
              <button aria-pressed={mode === "warm"} className={`rounded-xl px-3 py-2 text-sm font-black ${mode === "warm" ? "bg-amber-500 text-white" : "text-slate-600"}`} onClick={() => setMode("warm")} type="button">{HEADER_TEXT.warmMode}</button>
            </div>
            <a className="hidden rounded-2xl bg-slate-50 px-5 py-3 text-sm font-black text-slate-700 md:inline-flex" href="#report">{HEADER_TEXT.reportNav}</a>
          </div>
        </div>
      </div>
    </header>
  );
}

export function IntroPage({ checkForm, warm }) {
  if (warm) {
    return (
      <section className="bg-gradient-to-b from-white via-amber-50 to-amber-50" id="top">
        <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-5xl flex-col items-center justify-center px-4 py-10 text-center sm:px-6 lg:px-8">
          <div className="mb-5 inline-flex rounded-full bg-amber-100 px-4 py-2 text-sm font-black text-amber-900">
            {HEADER_TEXT.warmBadge}
          </div>
          <h1 className="max-w-3xl text-4xl font-black leading-tight tracking-normal text-slate-950 sm:text-5xl lg:text-6xl">
            {HEADER_TEXT.warmHeroTitle}
          </h1>
          <p className="mt-5 max-w-2xl text-lg font-bold leading-8 text-slate-600 sm:text-xl">
            {HEADER_TEXT.heroDescription}
          </p>
          <div className="mt-6 w-full max-w-3xl text-left">{checkForm}</div>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-white" id="top">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-5xl flex-col items-center px-4 pt-24 text-center sm:px-6 lg:px-8">
        <h1 className="text-4xl font-black leading-tight tracking-normal text-slate-900 sm:text-5xl">
          {HEADER_TEXT.heroTitlePrefix}<span className="text-sky-500">{HEADER_TEXT.heroTitleHighlight}</span>{HEADER_TEXT.heroTitleSuffix}
        </h1>
        <div className="mt-6 w-full max-w-3xl text-left">{checkForm}</div>
      </div>
    </section>
  );
}
