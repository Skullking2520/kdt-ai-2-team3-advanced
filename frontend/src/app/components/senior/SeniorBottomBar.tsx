import { useNavigate } from "react-router";
import { ArrowLeft, Home, HelpCircle } from "lucide-react";

/**
 * 시니어 친화 고정 바 — 어디서든 항상 보이는 3종 세트
 * ─────────────────────────────────
 * - ← 뒤로: history 있으면 back, 없으면 /senior-analyze
 * - 🏠 처음으로: / (홈)
 * - 도움말: /guide
 *
 * SeniorMode가 켜져 있을 때만 표시 (SeniorProvider에서 강제).
 */
export function SeniorBottomBar() {
  const nav = useNavigate();

  return (
    <div
      role="navigation"
      aria-label="시니어 모드 빠른 이동"
      className="fixed bottom-0 left-0 right-0 z-30 bg-white dark:bg-[#0d1526] border-t-2 border-blue-500/30 px-3 py-2 shadow-lg"
    >
      <div className="max-w-3xl mx-auto grid grid-cols-3 gap-2">
        <button
          onClick={() => {
            if (window.history.length > 1) window.history.back();
            else nav("/senior-analyze");
          }}
          className="flex items-center justify-center gap-2 py-3 rounded-xl bg-white dark:bg-white/5 border-2 border-gray-200 dark:border-white/15 text-gray-700 dark:text-white/80 hover:bg-gray-50 dark:hover:bg-white/10 active:scale-95 transition-all"
          style={{ fontSize: "1.05rem", fontWeight: 600 }}
        >
          <ArrowLeft size={22} />
          뒤로
        </button>
        <button
          onClick={() => nav("/senior-home")}
          className="flex items-center justify-center gap-2 py-3 rounded-xl bg-white dark:bg-white/5 border-2 border-gray-200 dark:border-white/15 text-gray-700 dark:text-white/80 hover:bg-gray-50 dark:hover:bg-white/10 active:scale-95 transition-all"
          style={{ fontSize: "1.05rem", fontWeight: 600 }}
        >
          <Home size={22} />
          처음
        </button>
        <button
          onClick={() => nav("/guide")}
          className="flex items-center justify-center gap-2 py-3 rounded-xl bg-cyan-500/15 dark:bg-cyan-500/20 border-2 border-cyan-500/40 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-500/20 dark:hover:bg-cyan-500/30 active:scale-95 transition-all"
          style={{ fontSize: "1.05rem", fontWeight: 600 }}
        >
          <HelpCircle size={22} />
          도움
        </button>
      </div>
    </div>
  );
}
