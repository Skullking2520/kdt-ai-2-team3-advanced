import { useState } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  MessageSquareWarning,
  Link2,
  ImageIcon,
  CheckCircle2,
  AlertTriangle,
  Shield,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  Home,
  Volume2,
  HelpCircle,
  type LucideIcon,
} from "lucide-react";
import { api, ApiException } from "@/lib/api";
import { ErrorState } from "./ErrorState";

/* ────────────────────────── 카피 모음 (디자인 변경 시 여기만 수정) ────────────────────────── */

const COPY = {
  pageBadge: "간편 검사",
  pageTitle: "어디가 이상한지 잘 모르겠어요",
  pageSubtitle: "받는 그대로 검사해드릴게요",

  stepLabels: ["유형 선택", "내용 입력", "검사 중", "결과 확인"],

  selectStep: {
    title: "어떤 걸 검사할까요?",
    sub: "받고 싶은 항목을 눌러주세요",
  },
  inputStep: {
    smsTitle: "의심 문자 내용을 붙여넣으세요",
    smsSub: "받는 그대로 복사해서 넣어주세요",
    urlTitle: "의심 주소를 입력하세요",
    urlSub: "문자나 카톡에 받은 주소를 그대로 입력",
    imageTitle: "사진을 올려주세요",
    imageSub: "문자 캡처, 주소 캡처 모두 가능",
    inputPlaceholder: "여기에 붙여넣기...",
    inputHint: "최소 5자 이상 입력해주세요",
  },
  resultStep: {
    safe: {
      title: "안전해요",
      sub: "특별히 위험한 부분이 발견되지 않았어요",
    },
    caution: {
      title: "주의가 필요해요",
      sub: "몇 가지 의심스러운 점이 있어요. 자세한 내용은 아래에서 확인하세요",
    },
    danger: {
      title: "위험해요!",
      sub: "스미싱일 가능성이 매우 높아요. 절대 링크를 클릭하지 마세요",
    },
    detail: "자세히 알아보기",
    newCheck: "다른 것 검사하기",
  },

  errorRetry: "다시 시도",
  back: "이전",
  next: "다음",
  home: "홈으로",
  voice: "다시 듣기",
} as const;

/* ────────────────────────── 라우트 헬퍼 ────────────────────────── */

type StepId = "select" | "input" | "loading" | "result";
type InputType = "sms" | "url" | "image";

const STEP_ORDER: StepId[] = ["select", "input", "loading", "result"];

function stepIndex(s: StepId) {
  return STEP_ORDER.indexOf(s);
}

/* ────────────────────────── 메인 컴포넌트 ────────────────────────── */

export function EasyCheck() {
  const nav = useNavigate();
  const [step, setStep] = useState<StepId>("select");
  const [type, setType] = useState<InputType>("sms");
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    level: "safe" | "caution" | "danger";
    summary: string;
    detail: string;
  } | null>(null);

  const goTo = (s: StepId) => setStep(s);
  const goNext = () => {
    const i = stepIndex(step);
    if (i < STEP_ORDER.length - 1) setStep(STEP_ORDER[i + 1]);
  };
  const goPrev = () => {
    const i = stepIndex(step);
    if (i > 0) setStep(STEP_ORDER[i - 1]);
  };

  const handleSelect = (t: InputType) => {
    setType(t);
    setText("");
    setError(null);
    setResult(null);
    setStep("input");
  };

  const handleAnalyze = async () => {
    if (text.trim().length < 5) {
      setError("내용을 조금 더 입력해주세요 (5자 이상)");
      return;
    }
    setError(null);
    setStep("loading");
    try {
      const r = await api.analyze({ type, content: text });
      const level: "safe" | "caution" | "danger" =
        r.riskLevel === "high" ? "danger" :
        r.riskLevel === "medium" ? "caution" : "safe";
      setResult({
        level,
        summary: r.smishingType,
        detail: r.reasons[0]?.label ?? COPY.resultStep[level].sub,
      });
      setStep("result");
    } catch (e) {
      const msg = e instanceof ApiException ? e.message : "검사 중 오류가 발생했어요";
      setError(msg);
      setStep("input");
    }
  };

  const handleReset = () => {
    setStep("select");
    setType("sms");
    setText("");
    setError(null);
    setResult(null);
  };

  /* ─── 음성 안내 (TTS) ─── */
  const speak = (text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "ko-KR";
    u.rate = 0.85;
    window.speechSynthesis.speak(u);
  };

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-2xl">
        {/* 헤더 (도움말 버튼) */}
        <div className="flex items-center justify-end mb-3">
          <button
            onClick={() => nav("/guide")}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs bg-white/5 hover:bg-white/10 text-white/55 border border-white/10 transition-colors"
            title="도움말"
          >
            <HelpCircle size={12} />
            도움말
          </button>
        </div>

        {/* 진행 표시 (간단) */}
        <StepIndicator currentStep={step} />

        {/* 컨텐츠 영역 */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="mt-6"
          >
            {step === "select" && <SelectStep onSelect={handleSelect} onHome={() => nav("/")} />}
            {step === "input" && (
              <InputStep
                type={type}
                text={text}
                onTextChange={setText}
                onSubmit={handleAnalyze}
                onBack={goPrev}
                error={error}
                speak={speak}
              />
            )}
            {step === "loading" && <LoadingStep />}
            {step === "result" && result && (
              <ResultStep
                result={result}
                onDetail={() => nav("/analyze/result/easy-" + Date.now() + `?text=${encodeURIComponent(text)}&type=${type}`)}
                onReset={handleReset}
                onHome={() => nav("/")}
                speak={speak}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ────────────────────────── 4단계 컴포넌트들 ────────────────────────── */

function StepIndicator({ currentStep }: { currentStep: StepId }) {
  const i = stepIndex(currentStep);
  return (
    <div className="flex items-center justify-center gap-2">
      {STEP_ORDER.map((s, idx) => {
        const done = idx < i;
        const active = idx === i;
        return (
          <div
            key={s}
            className={`h-1.5 rounded-full transition-all ${
              active ? "w-10 bg-blue-500" : done ? "w-6 bg-blue-500/50" : "w-6 bg-white/10"
            }`}
          />
        );
      })}
    </div>
  );
}

/* ───── Step 1: 유형 선택 ───── */

const SELECT_OPTIONS: { type: InputType; icon: LucideIcon; label: string; sub: string; color: string }[] = [
  { type: "sms",   icon: MessageSquareWarning, label: "문자 검사",  sub: "받은 문자가 의심스러워요",     color: "from-blue-500 to-cyan-500" },
  { type: "url",   icon: Link2,                 label: "주소 검사",  sub: "의심스러운 인터넷 주소",         color: "from-violet-500 to-purple-500" },
  { type: "image", icon: ImageIcon,             label: "사진 검사",  sub: "문자 캡처나 주소 캡처",        color: "from-emerald-500 to-teal-500" },
];

function SelectStep({ onSelect, onHome }: { onSelect: (t: InputType) => void; onHome: () => void }) {
  return (
    <div className="space-y-3">
      <div className="text-center mb-6">
        <h2 className="text-2xl text-white mb-2" style={{ fontWeight: 700, letterSpacing: "-0.01em" }}>
          {COPY.selectStep.title}
        </h2>
        <p className="text-base text-white/50">{COPY.selectStep.sub}</p>
      </div>
      <div className="space-y-3">
        {SELECT_OPTIONS.map(({ type, icon: Icon, label, sub, color }) => (
          <button
            key={type}
            onClick={() => onSelect(type)}
            className={`w-full flex items-center gap-5 p-5 rounded-2xl bg-gradient-to-br ${color} shadow-lg active:scale-[0.98] hover:scale-[1.01] transition-all text-left`}
          >
            <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
              <Icon size={32} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xl text-white" style={{ fontWeight: 700 }}>{label}</p>
              <p className="text-sm text-white/85 mt-1">{sub}</p>
            </div>
            <ChevronRight size={24} className="text-white/70 shrink-0" />
          </button>
        ))}
      </div>
      <button
        onClick={onHome}
        className="w-full flex items-center justify-center gap-1.5 py-3 mt-2 text-sm text-white/40 hover:text-white/70 transition-colors"
      >
        <Home size={14} />
        {COPY.home}
      </button>
    </div>
  );
}

/* ───── Step 2: 내용 입력 ───── */

function InputStep({
  type, text, onTextChange, onSubmit, onBack, error, speak,
}: {
  type: InputType;
  text: string;
  onTextChange: (v: string) => void;
  onSubmit: () => void;
  onBack: () => void;
  error: string | null;
  speak: (t: string) => void;
}) {
  const inputCfg = {
    sms:   { title: COPY.inputStep.smsTitle,   sub: COPY.inputStep.smsSub,   placeholder: "예) [CJ대한통운] 배송 주소 확인..." },
    url:   { title: COPY.inputStep.urlTitle,   sub: COPY.inputStep.urlSub,   placeholder: "예) http://nhis-pay.kr/login" },
    image: { title: COPY.inputStep.imageTitle, sub: COPY.inputStep.imageSub, placeholder: "" },
  }[type];

  return (
    <div>
      <div className="text-center mb-6">
        <h2 className="text-2xl text-white mb-2" style={{ fontWeight: 700, letterSpacing: "-0.01em" }}>
          {inputCfg.title}
        </h2>
        <p className="text-base text-white/50">{inputCfg.sub}</p>
      </div>

      {type === "image" ? (
        <ImagePickerPlaceholder onBack={onBack} />
      ) : (
        <textarea
          value={text}
          onChange={(e) => onTextChange(e.target.value.slice(0, 500))}
          placeholder={inputCfg.placeholder}
          rows={6}
          className="w-full p-5 text-lg bg-[#111c30] border-2 border-white/15 rounded-2xl text-white placeholder:text-white/25 focus:border-blue-500 focus:outline-none transition-colors leading-relaxed resize-none"
        />
      )}

      {error && (
        <div className="mt-3 flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
          <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      <div className="flex items-center gap-2 mt-6">
        <button
          onClick={onBack}
          className="flex items-center gap-1 px-5 py-4 rounded-2xl text-base bg-white/5 hover:bg-white/10 text-white/70 border border-white/10 transition-colors"
        >
          <ChevronLeft size={18} />
          {COPY.back}
        </button>
        <button
          onClick={() => speak(inputCfg.title)}
          className="flex items-center justify-center w-14 h-14 rounded-2xl text-base bg-white/5 hover:bg-white/10 text-white/70 border border-white/10 transition-colors shrink-0"
          title={COPY.voice}
        >
          <Volume2 size={20} />
        </button>
        <button
          onClick={onSubmit}
          disabled={text.trim().length < 5}
          className="flex-1 flex items-center justify-center gap-1 px-5 py-4 rounded-2xl text-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
          style={{ fontWeight: 700 }}
        >
          검사하기
          <ChevronRight size={20} />
        </button>
      </div>

      <p className="text-center text-xs text-white/30 mt-3">
        {COPY.inputStep.inputHint}
      </p>
    </div>
  );
}

function ImagePickerPlaceholder({ onBack }: { onBack: () => void }) {
  return (
    <div>
      <div className="border-2 border-dashed border-white/15 rounded-2xl p-10 text-center bg-[#111c30]">
        <ImageIcon size={48} className="mx-auto mb-3 text-white/30" />
        <p className="text-base text-white/60 mb-1" style={{ fontWeight: 600 }}>
          사진 선택은 메인 화면에서
        </p>
        <p className="text-sm text-white/40 leading-relaxed">
          사진 검사는 복잡해서<br />메인 검사 화면에서 진행해주세요
        </p>
      </div>
      <button
        onClick={onBack}
        className="w-full flex items-center justify-center gap-1 px-5 py-4 mt-4 rounded-2xl text-base bg-white/5 hover:bg-white/10 text-white/70 border border-white/10 transition-colors"
      >
        <ChevronLeft size={18} />
        {COPY.back}
      </button>
    </div>
  );
}

/* ───── Step 3: 검사 중 ───── */

function LoadingStep() {
  return (
    <div className="text-center py-12">
      <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-blue-500/15 border border-blue-500/25 mb-6">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
        >
          <Shield size={42} className="text-blue-400" />
        </motion.div>
      </div>
      <h2 className="text-2xl text-white mb-2" style={{ fontWeight: 700, letterSpacing: "-0.01em" }}>
        검사하고 있어요
      </h2>
      <p className="text-base text-white/50">잠시만 기다려주세요 (3~5초)</p>
    </div>
  );
}

/* ───── Step 4: 결과 (3카드) ───── */

function ResultStep({
  result, onDetail, onReset, onHome, speak,
}: {
  result: { level: "safe" | "caution" | "danger"; summary: string; detail: string };
  onDetail: () => void;
  onReset: () => void;
  onHome: () => void;
  speak: (t: string) => void;
}) {
  const cfg = {
    safe: {
      icon: CheckCircle2,
      bg: "from-emerald-500/20 to-emerald-600/10",
      border: "border-emerald-500/30",
      iconBg: "bg-emerald-500/20",
      iconColor: "text-emerald-400",
      card: COPY.resultStep.safe,
    },
    caution: {
      icon: AlertTriangle,
      bg: "from-amber-500/20 to-amber-600/10",
      border: "border-amber-500/30",
      iconBg: "bg-amber-500/20",
      iconColor: "text-amber-400",
      card: COPY.resultStep.caution,
    },
    danger: {
      icon: ShieldCheck,
      bg: "from-red-500/20 to-red-600/10",
      border: "border-red-500/30",
      iconBg: "bg-red-500/20",
      iconColor: "text-red-400",
      card: COPY.resultStep.danger,
    },
  }[result.level];

  const Icon = cfg.icon;

  return (
    <div>
      <div className={`bg-gradient-to-br ${cfg.bg} border-2 ${cfg.border} rounded-3xl p-8 text-center mb-4`}>
        <div className={`inline-flex items-center justify-center w-20 h-20 rounded-3xl ${cfg.iconBg} mb-4`}>
          <Icon size={42} className={cfg.iconColor} />
        </div>
        <h2 className="text-3xl text-white mb-2" style={{ fontWeight: 800, letterSpacing: "-0.02em" }}>
          {cfg.card.title}
        </h2>
        <p className="text-base text-white/70 leading-relaxed mb-4">
          {cfg.card.sub}
        </p>
        <button
          onClick={() => speak(cfg.card.title)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs bg-white/10 hover:bg-white/15 text-white/70 transition-colors"
        >
          <Volume2 size={12} />
          {COPY.voice}
        </button>
      </div>

      {/* 요약 카드 */}
      <div className="bg-[#111c30] border border-white/10 rounded-2xl p-5 mb-4">
        <p className="text-xs text-white/40 mb-1.5" style={{ fontWeight: 600 }}>유형</p>
        <p className="text-lg text-white mb-3" style={{ fontWeight: 600 }}>{result.summary}</p>
        <p className="text-xs text-white/40 mb-1.5" style={{ fontWeight: 600 }}>주요 근거</p>
        <p className="text-sm text-white/70 leading-relaxed">{result.detail}</p>
      </div>

      {/* 액션 버튼 */}
      <div className="space-y-2">
        <button
          onClick={onDetail}
          className="w-full flex items-center justify-center gap-1.5 px-5 py-4 rounded-2xl text-base bg-blue-600 hover:bg-blue-500 text-white transition-colors"
          style={{ fontWeight: 600 }}
        >
          {COPY.resultStep.detail}
          <ChevronRight size={18} />
        </button>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onReset}
            className="flex items-center justify-center gap-1 px-4 py-3 rounded-2xl text-sm bg-white/5 hover:bg-white/10 text-white/70 border border-white/10 transition-colors"
          >
            {COPY.resultStep.newCheck}
          </button>
          <button
            onClick={onHome}
            className="flex items-center justify-center gap-1 px-4 py-3 rounded-2xl text-sm bg-white/5 hover:bg-white/10 text-white/70 border border-white/10 transition-colors"
          >
            <Home size={14} />
            {COPY.home}
          </button>
        </div>
      </div>
    </div>
  );
}
