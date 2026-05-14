import { Moon, ShieldCheck } from "lucide-react";

const navItems = [
  { href: "#analyzer", label: "검사하기" },
  { href: "#why", label: "만든 이유" },
  { href: "#features", label: "기능" },
  { href: "#how-it-works", label: "작동 방식" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex min-h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <a className="flex items-center gap-2" href="#top">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-700 text-white">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="text-lg font-black text-slate-950">문자안심 체크</span>
        </a>

        <nav className="hidden items-center gap-1 md:flex" aria-label="주요 메뉴">
          {navItems.map((item) => (
            <a
              className="rounded-lg px-3 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
              href={item.href}
              key={item.href}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <span className="hidden rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-700 sm:inline-flex">
            저장 없음
          </span>
          <button
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600"
            type="button"
            aria-label="화면 모드"
          >
            <Moon className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  );
}

