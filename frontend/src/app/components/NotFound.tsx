import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { Home, Search, ShieldCheck, ArrowLeft, Compass } from "lucide-react";

/* ────────────────────────── 404 페이지 ────────────────────────── */

const POPULAR_LINKS = [
  { to: "/analyze", icon: ShieldCheck, label: "문자 검사", desc: "스미싱 의심 문자 확인" },
  { to: "/url", icon: Search, label: "URL 검사", desc: "의심 링크 분석" },
  { to: "/cases", icon: Compass, label: "피해 사례", desc: "최근 스미싱 사례 보기" },
  { to: "/guide", icon: Home, label: "안전 가이드", desc: "스미싱 예방법" },
];

export function NotFound() {
  const nav = useNavigate();

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-lg text-center"
      >
        {/* 404 일러스트 */}
        <div className="mb-6">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-br from-blue-500/15 to-violet-500/15 border border-white/10 mb-4">
            <span className="text-4xl text-white/80" style={{ fontWeight: 800, letterSpacing: "-0.04em" }}>
              404
            </span>
          </div>
        </div>

        {/* 메시지 */}
        <h1 className="text-2xl text-white mb-2" style={{ fontWeight: 700, letterSpacing: "-0.01em" }}>
          페이지를 찾을 수 없어요
        </h1>
        <p className="text-sm text-white/50 mb-8 leading-relaxed">
          요청하신 페이지가 삭제되었거나, 주소가 잘못 입력된 것 같아요.
          <br />
          아래에서 다른 페이지를 확인해보세요.
        </p>

        {/* 액션 버튼 */}
        <div className="flex items-center justify-center gap-2 mb-10">
          <button
            onClick={() => nav(-1)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm bg-white/5 hover:bg-white/10 text-white/70 border border-white/10 transition-colors"
          >
            <ArrowLeft size={14} />
            이전 페이지
          </button>
          <button
            onClick={() => nav("/")}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm bg-blue-600 hover:bg-blue-500 text-white transition-colors"
            style={{ fontWeight: 600 }}
          >
            <Home size={14} />
            홈으로
          </button>
        </div>

        {/* 추천 링크 */}
        <div className="bg-[#111c30] border border-white/10 rounded-2xl p-5">
          <p className="text-xs text-white/40 mb-3 uppercase tracking-widest" style={{ fontWeight: 600 }}>
            추천 페이지
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {POPULAR_LINKS.map(({ to, icon: Icon, label, desc }) => (
              <button
                key={to}
                onClick={() => nav(to)}
                className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/8 hover:border-white/20 transition-all text-left"
              >
                <div className="w-9 h-9 rounded-lg bg-blue-500/15 flex items-center justify-center shrink-0">
                  <Icon size={15} className="text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white/85" style={{ fontWeight: 600 }}>{label}</p>
                  <p className="text-[11px] text-white/40 truncate">{desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
