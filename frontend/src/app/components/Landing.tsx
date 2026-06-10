import { useNavigate } from "react-router";
import { motion } from "motion/react";
import {
  MessageSquareWarning, Link2, ImageIcon, Flag,
  ShieldCheck, ArrowRight, AlertTriangle, TrendingUp,
  Package, Building2, Heart, CreditCard, ChevronRight,
} from "lucide-react";

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

const PHISHING_TYPES = [
  {
    icon: Package,
    label: "택배 사칭",
    example: "주소불명 반송 예정, 배송비 결제 요구",
    level: "급증",
    levelColor: "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20",
  },
  {
    icon: Building2,
    label: "공공기관 사칭",
    example: "건강보험, 국세청, 경찰 사칭 미납금 요구",
    level: "주의",
    levelColor: "text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20",
  },
  {
    icon: Heart,
    label: "청첩장 사칭",
    example: "지인 결혼 안내 링크로 악성 앱 설치 유도",
    level: "신종",
    levelColor: "text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20",
  },
  {
    icon: CreditCard,
    label: "카드사 사칭",
    example: "해외 결제 이상 감지, 본인 확인 링크 유도",
    level: "증가",
    levelColor: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20",
  },
];

const FEATURES = [
  {
    icon: ShieldCheck,
    title: "AI 기반 정확한 탐지",
    desc: "문자 패턴, URL, 키워드를 복합 분석하여 스미싱 여부를 판정합니다",
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-900/20",
  },
  {
    icon: AlertTriangle,
    title: "위험 근거 상세 제공",
    desc: "단순 판정이 아닌 왜 위험한지, 어떤 유형인지 구체적으로 안내합니다",
    color: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-50 dark:bg-orange-900/20",
  },
  {
    icon: TrendingUp,
    title: "피해 시나리오 제시",
    desc: "링크를 누르면 어떤 피해가 발생하는지 단계별로 설명합니다",
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-900/20",
  },
  {
    icon: MessageSquareWarning,
    title: "즉각적인 대응 방법",
    desc: "지금 당장 해야 할 행동을 명확하게 알려줍니다",
    color: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-50 dark:bg-violet-900/20",
  },
];

const RECENT_WARNINGS = [
  { text: "CJ대한통운 사칭 스미싱 주의보", time: "2시간 전", level: "긴급" },
  { text: "건강보험공단 사칭 피싱 신고 급증", time: "5시간 전", level: "경고" },
  { text: "청첩장 위장 악성 링크 주의", time: "1일 전", level: "주의" },
];

export function Landing() {
  const navigate = useNavigate();

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
            {/* 3-in-1 입력 시각화 (차별점 #1) */}
            <div className="flex items-center justify-center gap-2 mb-6 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-700/30" style={{ fontWeight: 600 }}>
                <MessageSquareWarning size={13} /> 문자
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-400 border border-violet-100 dark:border-violet-700/30" style={{ fontWeight: 600 }}>
                <Link2 size={13} /> URL
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-700/30" style={{ fontWeight: 600 }}>
                <ImageIcon size={13} /> 이미지
              </span>
              <span className="text-xs text-gray-500 dark:text-white/40">3가지 한 번에 분석</span>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => navigate("/analyze")}
                className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm transition-all hover:opacity-90 shadow-sm"
                style={{ backgroundColor: "#2563EB", fontWeight: 600, color: "white" }}
              >
                <MessageSquareWarning size={16} style={{ color: "white" }} />
                문자 검사 시작
                <ArrowRight size={14} style={{ color: "white" }} />
              </button>
              <button
                onClick={() => navigate("/guide")}
                className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-gray-700 dark:text-white/70 text-sm bg-gray-100 dark:bg-white/8 hover:bg-gray-200 dark:hover:bg-white/12 transition-all"
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
        <p className="text-xs font-semibold text-gray-400 dark:text-white/30 mb-4 uppercase tracking-widest">검사 유형 선택</p>
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

      {/* Phishing types + Recent warnings */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <p className="text-xs font-semibold text-gray-400 dark:text-white/30 mb-4 uppercase tracking-widest">최근 많이 발견되는 유형</p>
            <div className="space-y-2">
              {PHISHING_TYPES.map(({ icon: Icon, label, example, level, levelColor }, i) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="flex items-start gap-3 p-4 bg-white dark:bg-[#111c30] border border-gray-100 dark:border-white/8 rounded-xl hover:border-gray-200 dark:hover:border-white/15 transition-all"
                >
                  <div className="w-9 h-9 rounded-lg bg-gray-50 dark:bg-white/5 flex items-center justify-center shrink-0">
                    <Icon size={16} className="text-gray-500 dark:text-white/50" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm text-gray-900 dark:text-white" style={{ fontWeight: 600 }}>{label}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${levelColor}`}>{level}</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-white/40">{example}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-400 dark:text-white/30 mb-4 uppercase tracking-widest">최신 보안 경보</p>
            <div className="space-y-2 mb-4">
              {RECENT_WARNINGS.map(({ text, time, level }, i) => (
                <motion.div
                  key={text}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="flex items-start gap-3 p-4 bg-white dark:bg-[#111c30] border border-gray-100 dark:border-white/8 rounded-xl"
                >
                  <AlertTriangle size={14} className="text-orange-500 dark:text-orange-400 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 dark:text-white/80 leading-snug">{text}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-gray-400 dark:text-white/30">{time}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-medium">{level}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
            <button
              onClick={() => navigate("/cases")}
              className="w-full py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-sm text-gray-500 dark:text-white/40 hover:bg-gray-50 dark:hover:bg-white/5 transition-all flex items-center justify-center gap-1"
            >
              전체 피해 사례 보기
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      </section>

      <div className="border-t border-gray-100 dark:border-white/8" />

      {/* Features */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <p className="text-xs font-semibold text-gray-400 dark:text-white/30 mb-6 uppercase tracking-widest">서비스 특징</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {FEATURES.map(({ icon: Icon, title, desc, color, bg }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className="flex gap-4 p-5 bg-white dark:bg-[#111c30] border border-gray-100 dark:border-white/8 rounded-xl"
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${bg}`}>
                <Icon size={18} className={color} />
              </div>
              <div>
                <p className="text-sm text-gray-900 dark:text-white mb-1" style={{ fontWeight: 600 }}>{title}</p>
                <p className="text-xs text-gray-500 dark:text-white/40 leading-relaxed">{desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-gray-100 dark:border-white/8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
          <div className="rounded-2xl p-6 sm:p-8 text-center bg-blue-50 dark:bg-blue-900/15 border border-blue-100 dark:border-blue-700/30">
            <ShieldCheck size={28} className="mx-auto mb-3" style={{ color: "#2563EB" }} />
            <h2 className="text-lg text-gray-900 dark:text-white mb-2" style={{ fontWeight: 700 }}>의심스러운 문자를 받으셨나요?</h2>
            <p className="text-sm text-gray-600 dark:text-white/50 mb-5">문자를 그대로 복사해서 붙여넣으면 바로 확인할 수 있습니다.</p>
            <button
              onClick={() => navigate("/analyze")}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm transition-all hover:opacity-90"
              style={{ backgroundColor: "#2563EB", fontWeight: 600, color: "white" }}
            >
              지금 바로 확인하기
              <ArrowRight size={14} style={{ color: "white" }} />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
