import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Heart, ChevronDown, CheckCircle2, Phone, MessageSquare, Shield, Link2, Clock, CreditCard } from "lucide-react"

const STEPS = [
  {
    icon: MessageSquare,
    title: "모르는 번호에서 문자가 왔어요",
    cardCls: "border-blue-200 dark:border-blue-500/25 bg-blue-50 dark:bg-blue-500/5",
    titleCls: "text-blue-700 dark:text-blue-300",
    content: `모르는 번호에서 갑자기 문자가 왔다면, 일단 멈추세요!

• 문자를 받았다고 바로 링크를 클릭하거나 전화를 걸지 마세요.
• 공공기관(건강보험, 경찰, 은행)은 문자로 개인정보를 요구하지 않아요.
• 가족이나 주변 사람에게 먼저 물어보세요.`,
  },
  {
    icon: Link2,
    title: "문자 안에 인터넷 주소(링크)가 있어요",
    cardCls: "border-red-200 dark:border-red-500/25 bg-red-50 dark:bg-red-500/5",
    titleCls: "text-red-700 dark:text-red-300",
    content: `문자 안에 http:// 또는 https://로 시작하는 주소가 있으면 조심하세요!

• 절대 클릭하지 마세요 — 클릭만 해도 개인정보가 빠져나갈 수 있어요.
• 이미 클릭했다면 즉시 인터넷을 끊고 가족에게 알리세요.
• 정보를 입력했다면 해당 기관(은행, 건강보험 등)에 바로 전화하세요.`,
  },
  {
    icon: Clock,
    title: '"지금 당장 하지 않으면 큰일 난다"고 해요',
    cardCls: "border-orange-200 dark:border-orange-500/25 bg-orange-50 dark:bg-orange-500/5",
    titleCls: "text-orange-700 dark:text-orange-300",
    content: `"즉시", "긴급", "24시간 내", "지금 바로" 같은 말로 서두르게 만드는 건 사기의 특징이에요!

• 급하게 결정하지 마세요. 진짜 기관은 절대 그렇게 하지 않아요.
• 전화를 끊거나 문자를 닫고, 잠깐 쉬면서 가족에게 물어보세요.
• 해당 기관 공식 전화번호(114에서 확인)로 직접 확인하세요.`,
  },
  {
    icon: CreditCard,
    title: "돈을 보내달라거나 계좌번호를 물어봐요",
    cardCls: "border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/8",
    titleCls: "text-red-700 dark:text-red-300",
    content: `돈을 요구하거나 계좌번호, 카드번호, 비밀번호를 묻는 건 100% 사기예요!

• 어떤 기관도 문자로 돈을 요구하지 않아요.
• 이미 돈을 보냈다면 즉시 112(경찰)에 신고하세요.
• 계좌번호를 알려줬다면 해당 은행에 즉시 전화해서 "지급 정지"를 요청하세요.`,
  },
  {
    icon: CheckCircle2,
    title: "의심 문자, 이렇게 처리하세요",
    cardCls: "border-emerald-200 dark:border-emerald-500/25 bg-emerald-50 dark:bg-emerald-500/5",
    titleCls: "text-emerald-700 dark:text-emerald-300",
    content: `의심스러운 문자를 받았을 때 안전하게 처리하는 방법이에요:

1. 링크를 클릭하지 않는다
2. 답장하지 않는다
3. 발신 번호를 차단한다
4. 문자를 신고한다 (스팸 신고)
5. 가족이나 경찰(112)에 알린다`,
  },
];

const EMERGENCY_CONTACTS = [
  { name: "경찰청 (사이버범죄 신고)", number: "182", cls: "bg-blue-50 dark:bg-blue-500/15 border-blue-200 dark:border-blue-500/25 text-blue-700 dark:text-blue-300" },
  { name: "금융감독원 (금융사기 신고)", number: "1332", cls: "bg-emerald-50 dark:bg-emerald-500/15 border-emerald-200 dark:border-emerald-500/25 text-emerald-700 dark:text-emerald-300" },
  { name: "한국인터넷진흥원 (스미싱 신고)", number: "118", cls: "bg-cyan-50 dark:bg-cyan-500/15 border-cyan-200 dark:border-cyan-500/25 text-cyan-700 dark:text-cyan-300" },
  { name: "경찰청 긴급신고", number: "112", cls: "bg-red-50 dark:bg-red-500/15 border-red-200 dark:border-red-500/25 text-red-700 dark:text-red-300" },
];

export function VulnerableGuide() {
  const [openStep, setOpenStep] = useState<number | null>(0);

  return (
    <div className="px-4 sm:px-6 py-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Heart size={16} className="text-rose-500 dark:text-rose-400" />
          <span className="text-xs text-rose-600 dark:text-rose-400 font-semibold uppercase tracking-widest">피해 예방 안내</span>
        </div>
        <h1 className="text-gray-900 dark:text-white mb-2" style={{ fontWeight: 700, fontSize: "1.75rem" }}>
          스미싱 피해 예방 안내
        </h1>
        <p className="text-gray-500 dark:text-white/50" style={{ fontSize: "1rem" }}>
          어르신과 디지털 취약 계층을 위한 쉬운 설명
        </p>
      </div>

      {/* Intro banner */}
      <div className="bg-rose-50 dark:bg-rose-500/8 border border-rose-100 dark:border-rose-500/20 rounded-2xl p-5 mb-8">
        <p className="text-gray-700 dark:text-white/70 leading-relaxed" style={{ fontSize: "1.05rem" }}>
          요즘 스마트폰 문자를 통한 사기(스미싱)가 많이 일어나고 있어요.<br />
          아래 내용을 잘 읽어보시면 <span className="text-rose-600 dark:text-rose-300" style={{ fontWeight: 600 }}>사기 문자를 피하는 데 도움이 됩니다.</span>
        </p>
      </div>

      {/* Step guide */}
      <div className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <Shield size={16} className="text-gray-400 dark:text-white/50" />
          <p className="text-gray-700 dark:text-white/70" style={{ fontWeight: 600, fontSize: "1.05rem" }}>상황별 대처법</p>
        </div>
        <div className="space-y-3">
          {STEPS.map((step, i) => (
            <div key={i} className={`rounded-2xl border overflow-hidden ${step.cardCls}`}>
              <button
                onClick={() => setOpenStep(openStep === i ? null : i)}
                className="w-full flex items-center gap-4 px-5 py-4 text-left"
              >
                <step.icon size={20} className={step.titleCls} />
                <span className={`flex-1 ${step.titleCls}`} style={{ fontWeight: 600, fontSize: "1rem" }}>
                  {step.title}
                </span>
                <ChevronDown
                  size={18}
                  className={`text-gray-400 dark:text-white/30 transition-transform shrink-0 ${openStep === i ? "rotate-180" : ""}`}
                />
              </button>
              <AnimatePresence>
                {openStep === i && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: "auto" }}
                    exit={{ height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pb-5">
                      <p className="text-gray-600 dark:text-white/65 whitespace-pre-line leading-relaxed" style={{ fontSize: "0.95rem" }}>
                        {step.content}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>

      {/* Quiz 섹션 제거 (라운드6+ 정직성 cleanup)
          - 이유: QUIZ_ITEMS mock 4개뿐 = 정직하지 않음
          - /quiz 라우트는 라운드6 만장일치 5x cleanup에서 이미 휴지통됨
          - /guide 안의 "연습해보기" inline quiz도 동일 정직성 문제로 삭제
          - 학습 콘텐츠는 위 5단계 상황별 대처법 + 피해 발생 시 연락처로 충분
          - 백엔드 RAG/Pinecone 연동 시 진짜 사례 기반 학습 콘텐츠 추가 가능 */}

      {/* Emergency contacts */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Phone size={16} className="text-gray-400 dark:text-white/50" />
          <p className="text-gray-700 dark:text-white/70" style={{ fontWeight: 600, fontSize: "1.05rem" }}>피해 발생 시 연락처</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {EMERGENCY_CONTACTS.map((c) => (
            <div key={c.name} className={`rounded-2xl border p-4 ${c.cls}`}>
              <div className="flex items-center gap-3">
                <Phone size={20} />
                <div>
                  <p className="text-xs mb-0.5 opacity-70">{c.name}</p>
                  <p style={{ fontWeight: 800, fontSize: "1.6rem", letterSpacing: "0.05em" }}>{c.number}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 p-4 rounded-xl bg-gray-50 dark:bg-white/3 border border-gray-100 dark:border-white/8">
          <p className="text-gray-500 dark:text-white/40 text-xs leading-relaxed">
            <strong className="text-gray-700 dark:text-white/60">기억하세요:</strong> 이미 사기 피해를 당했어도 신고하면 도움받을 수 있어요.
            부끄러운 일이 아니에요. 지금 바로 신고하세요!
          </p>
        </div>
      </div>
    </div>
  );
}
