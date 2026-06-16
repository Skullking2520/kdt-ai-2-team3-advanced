import {useNavigate} from "react-router";
import {motion} from "motion/react";
import {useSenior} from "@/app/context/SeniorContext";
import {
  ShieldAlert, MessageSquareWarning, Link2, Phone, Flag, Heart,
  Trophy, BookMarked, ArrowRight, ImageIcon,
  AlertTriangle, PhoneCall, HelpCircle,
} from "lucide-react";

/* ── 5개 메인 기능 버튼 ───────────────────────────────── */
const MAIN_ACTIONS = [
  { icon: MessageSquareWarning, title: "문자 검사", sub: "받은 문자를 붙여넣으면 위험한지 알려드려요", to: "/senior-analyze", color: "from-cyan-500 to-blue-600", glow: "shadow-cyan-500/30" },
  { icon: ImageIcon, title: "이미지 검사", sub: "문자 사진 스크린샷 분석", to: "/senior-image", color: "from-emerald-500 to-teal-600", glow: "shadow-emerald-500/30" },
  { icon: Link2, title: "링크(URL) 검사", sub: "의심스러운 인터넷 주소 확인", to: "/url", color: "from-amber-500 to-orange-600", glow: "shadow-amber-500/25" },
  { icon: Phone, title: "전화번호 조회", sub: "이 번호가 위험한지 확인", to: "/sender", color: "from-sky-500 to-blue-500", glow: "shadow-sky-500/25" },
  { icon: Flag, title: "신고하기", sub: "피해·의심 문자 신고", to: "/report", color: "from-red-500 to-rose-600", glow: "shadow-red-500/25" },
];

/* ── 학습 콘텐츠 ──────────────────────────────────────── */
const LEARNING = [
  { icon: Heart, title: "안전 사용 가이드", sub: "꼭 알아야 할 7가지 수칙", to: "/guide", color: "text-red-500 dark:text-red-400" },
  { icon: BookMarked, title: "실제 피해 사례", sub: "다른 분들의 경험 보기", to: "/cases", color: "text-indigo-500 dark:text-indigo-400" },
  { icon: Trophy, title: "스미싱 퀴즈", sub: "재미있게 안목 키우기", to: "/quiz", color: "text-fuchsia-500 dark:text-fuchsia-400" },
];

/* ── 긴급 연락 ────────────────────────────────────────── */
const EMERGENCY = [
  { num: "112", label: "경찰 신고", sub: "긴급 사기 피해", color: "from-red-600 to-red-700", icon: AlertTriangle },
  { num: "1332", label: "금감원 보이스피싱", sub: "금융 사기 상담", color: "from-amber-600 to-orange-700", icon: PhoneCall },
  { num: "118", label: "사이버 신고센터", sub: "인터넷·문자 신고", color: "from-blue-600 to-indigo-700", icon: ShieldAlert },
];

export function SeniorHome() {
  const nav = useNavigate();
  const { setSenior } = useSenior();

  return (
    <div className="min-h-full bg-background text-foreground">
      <div className="px-6 py-8 max-w-3xl mx-auto pb-32">
        {/* 환영 헤더 */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <div className="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 items-center justify-center shadow-xl shadow-cyan-500/30 mb-4">
            <ShieldAlert size={32} className="text-white" />
          </div>
          <h1 className="mb-3 text-foreground" style={{ fontWeight: 800, fontSize: "2rem", letterSpacing: "-0.02em" }}>
            안녕하세요!
          </h1>
          <p className="text-muted-foreground" style={{ fontSize: "1.25rem", lineHeight: 1.65, fontWeight: 500 }}>
            의심스러운 문자를 받으셨나요?<br />
            아래 큰 파란 버튼을 눌러주세요.
          </p>
        </motion.div>

        {/* 4개 메인 기능 버튼 — 2×2 그리드, 동일 크기 */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          {MAIN_ACTIONS.map((a, i) => (
            <motion.button
              key={a.to}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.06 }}
              onClick={() => nav(a.to)}
              className={`rounded-2xl bg-gradient-to-br ${a.color} shadow-xl ${a.glow} hover:scale-[1.02] active:scale-[0.99] transition-all p-4 sm:p-5 text-left flex flex-col gap-2`}
            >
              <a.icon size={28} className="text-white" />
              <p className="text-white" style={{ fontWeight: 700, fontSize: "1.15rem", letterSpacing: "-0.01em" }}>{a.title}</p>
              <p className="text-white/85 hidden sm:block" style={{ fontSize: "0.85rem" }}>{a.sub}</p>
            </motion.button>
          ))}
        </div>

        {/* 학습 콘텐츠 섹션 — "학습 콘텐츠" 헤더 + 3개 학습 항목 */}
        <div className="mb-10">
          <p className="text-muted-foreground mb-4 flex items-center gap-2" style={{ fontSize: "1.1rem", fontWeight: 700 }}>
            <HelpCircle size={22} className="text-cyan-500 dark:text-cyan-400" />
            학습 콘텐츠
          </p>
          <div className="space-y-3">
            {LEARNING.map((a) => (
              <button
                key={a.to}
                onClick={() => nav(a.to)}
                className="w-full flex items-center gap-4 p-5 rounded-2xl bg-card border-2 border-border hover:border-cyan-500/40 active:scale-[0.99] transition-all text-left"
              >
                <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center shrink-0">
                  <a.icon size={26} className={a.color} />
                </div>
                <div className="flex-1">
                  <p className="text-foreground" style={{ fontWeight: 600, fontSize: "1.15rem" }}>{a.title}</p>
                  <p className="text-muted-foreground mt-0.5" style={{ fontSize: "0.95rem" }}>{a.sub}</p>
                </div>
                <ArrowRight size={22} className="text-muted-foreground shrink-0" />
              </button>
            ))}
          </div>
        </div>

        {/* 긴급 연락 — 112 / 1332 / 118 */}
        <div className="mb-10">
          <p className="text-muted-foreground mb-3 flex items-center gap-2" style={{ fontSize: "1.1rem", fontWeight: 600 }}>
            <AlertTriangle size={22} className="text-red-500 dark:text-red-400" />
            급할 때 바로 전화하세요
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {EMERGENCY.map((e) => (
              <a
                key={e.num}
                href={`tel:${e.num}`}
                className={`rounded-2xl bg-gradient-to-br ${e.color} shadow-lg p-5 text-left flex items-center gap-4 hover:scale-[1.02] active:scale-[0.98] transition-all`}
              >
                <div className="w-14 h-14 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                  <e.icon size={26} className="text-white" />
                </div>
                <div>
                  <p className="text-white" style={{ fontWeight: 800, fontSize: "1.5rem" }}>{e.num}</p>
                  <p className="text-white/90" style={{ fontSize: "0.95rem", fontWeight: 600 }}>{e.label}</p>
                  <p className="text-white/70" style={{ fontSize: "0.85rem" }}>{e.sub}</p>
                </div>
              </a>
            ))}
          </div>
        </div>

        {/* 사용 안내 카드 */}
        <div className="rounded-2xl bg-amber-500/10 border-2 border-amber-500/30 p-6 mb-6">
          <p className="text-amber-700 dark:text-amber-200 mb-4 flex items-center gap-2" style={{ fontWeight: 800, fontSize: "1.3rem" }}>
            이렇게 사용하세요
          </p>
          <ol className="space-y-4 text-foreground" style={{ fontSize: "1.15rem", lineHeight: 1.8, fontWeight: 500 }}>
            <li className="flex items-start gap-3">
              <span className="shrink-0 w-8 h-8 rounded-full bg-amber-500/30 text-amber-700 dark:text-amber-200 flex items-center justify-center" style={{ fontWeight: 800 }}>1</span>
              <span>받은 문자를 <b>길게 눌러</b> 복사하세요</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="shrink-0 w-8 h-8 rounded-full bg-amber-500/30 text-amber-700 dark:text-amber-200 flex items-center justify-center" style={{ fontWeight: 800 }}>2</span>
              <span>위쪽 <b>"문자 검사"</b> 큰 버튼을 누르세요</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="shrink-0 w-8 h-8 rounded-full bg-amber-500/30 text-amber-700 dark:text-amber-200 flex items-center justify-center" style={{ fontWeight: 800 }}>3</span>
              <span>빈 칸에 <b>붙여넣기</b> 하고 검사하기를 누르면 끝!</span>
            </li>
          </ol>
          <div className="mt-5 pt-5 border-t-2 border-amber-500/20">
            <p className="text-red-700 dark:text-red-200 mb-2" style={{ fontSize: "1.15rem", fontWeight: 700 }}>
              절대 하지 마세요!
            </p>
            <ul className="space-y-2 text-foreground" style={{ fontSize: "1.05rem", lineHeight: 1.7 }}>
              <li className="flex items-start gap-2">
                <span className="text-red-500 dark:text-red-400 shrink-0">•</span>
                <span>의심 문자의 <b className="text-red-700 dark:text-red-300">링크(주소)를 누르지 마세요</b></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 dark:text-red-400 shrink-0">•</span>
                <span>개인정보나 비밀번호를 <b className="text-red-700 dark:text-red-300">입력하지 마세요</b></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 dark:text-red-400 shrink-0">•</span>
                <span>상품권을 <b className="text-red-700 dark:text-red-300">구매하지 마세요</b></span>
              </li>
            </ul>
            <p className="text-emerald-700 dark:text-emerald-300 mt-4 pt-3 border-t border-amber-500/20" style={{ fontSize: "1rem", fontWeight: 600 }}>
              어렵다면 가족이나 자녀에게 도움을 요청하세요
            </p>
          </div>
        </div>

        {/* 일반 모드로 전환 */}
        <button
          onClick={() => {
            setSenior(false);
            nav("/");
          }}
          className="w-full mb-6 flex items-center justify-center gap-3 p-4 rounded-2xl bg-muted border-2 border-border text-muted-foreground hover:bg-accent hover:text-foreground active:scale-[0.99] transition-all"
          style={{ fontSize: "1rem", fontWeight: 600 }}
        >
          일반 모드로 전환하기
        </button>

        <p className="text-center text-muted-foreground mt-6" style={{ fontSize: "0.95rem" }}>
          도움 필요하시면 우측 상단 <b className="text-cyan-500 dark:text-cyan-400">🔊</b> 버튼을 눌러보세요.
        </p>
      </div>
    </div>
  );
}