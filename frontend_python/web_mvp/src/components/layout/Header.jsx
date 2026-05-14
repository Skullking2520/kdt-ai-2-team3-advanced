export function Header({ mode, setMode, warm }) {
  return (
    <header className="sticky top-0 z-30 bg-white">
      <div className="border-b border-slate-100 bg-white">
        <div className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <a className="text-2xl font-black tracking-normal text-slate-900" href="#check">문자안심</a>

          <nav className="hidden items-center gap-12 text-base font-black text-slate-700 md:flex">
            <a href="#check">검사하기</a>
            <a href="#cases">피해사례</a>
            <a href="#guide">예방법</a>
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-1 sm:flex">
              <button aria-pressed={mode === "modern"} className={`rounded-xl px-3 py-2 text-sm font-black ${mode === "modern" ? "bg-sky-500 text-white" : "text-slate-600"}`} onClick={() => setMode("modern")} type="button">일반</button>
              <button aria-pressed={mode === "warm"} className={`rounded-xl px-3 py-2 text-sm font-black ${mode === "warm" ? "bg-amber-500 text-white" : "text-slate-600"}`} onClick={() => setMode("warm")} type="button">쉬운모드</button>
            </div>
            <a className="hidden rounded-2xl bg-slate-50 px-5 py-3 text-sm font-black text-slate-700 md:inline-flex" href="#report">신고하기</a>
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
            쉬운모드 스미싱 검사기
          </div>
          <h1 className="max-w-3xl text-4xl font-black leading-tight tracking-normal text-slate-950 sm:text-5xl lg:text-6xl">
            의심가는 메시지를 물어보세요
          </h1>
          <p className="mt-5 max-w-2xl text-lg font-bold leading-8 text-slate-600 sm:text-xl">
            받은 문자가 수상하다면 그대로 붙여넣고 바로 확인하세요.
          </p>
          <div className="mt-8 w-full max-w-3xl text-left">{checkForm}</div>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-white" id="top">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-5xl flex-col items-center px-4 pt-32 text-center sm:px-6 lg:px-8">
        <h1 className="text-4xl font-black leading-tight tracking-normal text-slate-900 sm:text-5xl">
          의심가는 <span className="text-sky-500">메시지</span>를 물어보세요
        </h1>
        <div className="mt-8 w-full max-w-3xl text-left">{checkForm}</div>
      </div>
    </section>
  );
}
