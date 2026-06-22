import { useNavigate } from "react-router";
import { motion } from "motion/react";
import {
  MessageSquareWarning, Link2, ImageIcon, Flag,
  ShieldCheck, ArrowRight, ChevronRight,
  Accessibility,
} from "lucide-react";
import { useSenior } from "../context/SeniorContext";

const QUICK_ACTIONS = [
  {
    to: "/analyze",
    icon: MessageSquareWarning,
    label: "문자 검사",
    desc: "받은 문자를 붙여넣으면 스미싱 여부를 분석합니다",
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-900/20",
    border: "border-blue-100 dark:border-blue-700/30",
  },
  {
    to: "/url",
    icon: Link2,
    label: "URL 검사",
    desc: "의심스러운 링크 주소를 직접 분석합니다",
    color: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-50 dark:bg-violet-900/20",
    border: "border-violet-100 dark:border-violet-700/30",
  },
  {
    to: "/image",
    icon: ImageIcon,
    label: "이미지 검사",
    desc: "스크린샷을 업로드하면 문자를 추출해 분석합니다",
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-900/20",
    border: "border-emerald-100 dark:border-emerald-700/30",
  },
  {
    to: "/report",
    icon: Flag,
    label: "신고하기",
    desc: "새로운 스미싱 문자를 제보해 데이터베이스에 등록합니다",
    color: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-50 dark:bg-orange-900/20",
    border: "border-orange-100 dark:border-orange-700/30",
  },
];

export function Landing() {
  const navigate = useNavigate();
  const { setSenior } = useSenior();

  const enterSeniorMode = () => {
    setSenior(true);
    navigate("/senior-home");
  };

  return (
    <div>
      {/* Hero */}
      <section className="bg-white dark:bg-[#0d1526] border-b border-gray-100 dark:border-white/8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-20 text-center">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-700/30 mb-6">
              <ShieldCheck size={12} />
              스미싱 피해 예방 서비스
            </span>
            <h1 className="text-3xl sm:text-4xl text-gray-900 dark:text-white mb-4 leading-tight" style={{ fontWeight: 800 }}>
              의심스러운 문자, 링크, 이미지를<br />
              <span style={{ color: "#2563EB" }}>AI로 바로 확인하세요</span>
            </h1>
            <p className="text-base sm:text-lg text-gray-500 dark:text-white/50 mb-8 max-w-2xl mx-auto leading-relaxed">
              스미싱 여부뿐만 아니라 공격 유형, 위험 근거, 예상 피해, 대응 방법까지<br className="hidden sm:block" />
              한 번에 확인할 수 있습니다.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => navigate("/analyze")}
                className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm transition-all hover:opacity-90 shadow-sm cursor-pointer"
                style={{ backgroundColor: "#2563EB", fontWeight: 600, color: "white" }}
              >
                <MessageSquareWarning size={16} style={{ color: "white" }} />
                문자 검사 시작
                <ArrowRight size={14} style={{ color: "white" }} />
              </button>
              <button
                onClick={enterSeniorMode}
                className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-gray-700 dark:text-white/70 text-sm bg-gray-100 dark:bg-white/8 hover:bg-gray-200 dark:hover:bg-white/12 transition-all cursor-pointer"
                style={{ fontWeight: 500 }}
              >
                <Accessibility size={16} />
                어르신 예방 가이드
              </button>
              <button
                onClick={() => navigate("/guide")}
                className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-gray-700 dark:text-white/70 text-sm bg-gray-100 dark:bg-white/8 hover:bg-gray-200 dark:hover:bg-white/12 transition-all cursor-pointer"
                style={{ fontWeight: 500 }}
              >
                스미싱 예방 가이드 보기
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Quick actions */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <p className="text-xs font-semibold text-gray-400 dark:text-white/40 mb-4 uppercase tracking-widest">검사 유형 선택</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {QUICK_ACTIONS.map(({ to, icon: Icon, label, desc, color, bg, border }, i) => (
            <motion.button
              key={to}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              onClick={() => navigate(to)}
              className={`text-left p-4 rounded-xl border bg-white dark:bg-[#111c30] hover:shadow-md dark:hover:shadow-black/20 transition-all group ${border}`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${bg}`}>
                <Icon size={18} className={color} />
              </div>
              <p className="text-sm text-gray-900 dark:text-white mb-1" style={{ fontWeight: 600 }}>{label}</p>
              <p className="text-xs text-gray-500 dark:text-white/40 leading-relaxed hidden sm:block">{desc}</p>
              <div className={`flex items-center gap-1 mt-3 text-xs ${color} opacity-0 group-hover:opacity-100 transition-opacity`}>
                시작하기 <ChevronRight size={11} />
              </div>
            </motion.button>
          ))}
        </div>
      </section>

      <div className="border-t border-gray-100 dark:border-white/8" />

      {/* (삭제됨) "최근 많이 발견되는 유형" 4-카드 — 가짜 빈도 데이터 (택배/공공기관/청첩장/카드사 사칭) */}
      {/* (삭제됨) "최신 보안 경보" KISA·경찰청 amber 정직 배너 — 정부기관 RSS 미연동 안내 */}
    </div>
  );
}
