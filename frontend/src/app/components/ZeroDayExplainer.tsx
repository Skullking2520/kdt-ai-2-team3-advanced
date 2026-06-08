import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Cpu,
  ArrowRight,
  Sparkles,
  Eye,
  Brain,
  MessageSquare,
  ChevronRight,
  Play,
  RotateCcw,
  Layers,
  Zap,
} from "lucide-react";

/* ── 토큰화 시뮬레이션 ──────────────────────────────────── */
function tokenize(text: string): { token: string; type: string }[] {
  const tokens: { token: string; type: string }[] = [];
  const urlRegex = /https?:\/\/[^\s]+/g;
  const urgentWords = ["즉시", "긴급", "정지", "동결", "납부", "미납", "경고", "차단", "만료"];
  const govWords = ["국민건강보험", "국세청", "KB국민은행", "CJ대한통운", "경찰청"];

  let remaining = text;
  let cursor = 0;

  while (cursor < text.length) {
    // URL
    const urlMatch = text.slice(cursor).match(/^https?:\/\/[^\s]+/);
    if (urlMatch) {
      tokens.push({ token: urlMatch[0], type: "url" });
      cursor += urlMatch[0].length;
      continue;
    }
    // Gov words
    const govFound = govWords.find((w) => text.slice(cursor).startsWith(w));
    if (govFound) {
      tokens.push({ token: govFound, type: "entity" });
      cursor += govFound.length;
      continue;
    }
    // Urgent words
    const urgentFound = urgentWords.find((w) => text.slice(cursor).startsWith(w));
    if (urgentFound) {
      tokens.push({ token: urgentFound, type: "urgent" });
      cursor += urgentFound.length;
      continue;
    }
    // Numbers
    const numMatch = text.slice(cursor).match(/^\d+/);
    if (numMatch) {
      tokens.push({ token: numMatch[0], type: "number" });
      cursor += numMatch[0].length;
      continue;
    }
    // Brackets
    if ("【】[]()".includes(text[cursor])) {
      tokens.push({ token: text[cursor], type: "bracket" });
      cursor++;
      continue;
    }
    // Space
    if (text[cursor] === " ") {
      cursor++;
      continue;
    }
    // Korean chars (group them)
    const korMatch = text.slice(cursor).match(/^[가-힣]+/);
    if (korMatch) {
      tokens.push({ token: korMatch[0], type: "korean" });
      cursor += korMatch[0].length;
      continue;
    }
    // Other
    tokens.push({ token: text[cursor], type: "other" });
    cursor++;
  }
  return tokens;
}

const tokenStyles: Record<string, string> = {
  url: "bg-purple-500/20 border-purple-500/40 text-purple-300",
  entity: "bg-blue-500/20 border-blue-500/40 text-blue-300",
  urgent: "bg-red-500/20 border-red-500/40 text-red-300",
  number: "bg-yellow-500/20 border-yellow-500/40 text-yellow-300",
  bracket: "bg-white/10 border-white/20 text-white/50",
  korean: "bg-white/5 border-white/10 text-white/60",
  other: "bg-white/5 border-white/10 text-white/40",
};

const EXAMPLE_TEXT =
  "【국민건강보험】미납보험료가 있습니다. 즉시 납부하지 않으면 급여가 정지됩니다. http://nhis-pay.kr-notice.com";

const PIPELINE_STEPS = [
  {
    id: "input",
    icon: MessageSquare,
    label: "입력 문자",
    color: "text-white/60",
    bg: "bg-white/5",
    border: "border-white/15",
    desc: "사용자가 의심 문자를 시스템에 입력합니다.",
  },
  {
    id: "tokenize",
    icon: Layers,
    label: "토크나이저",
    color: "text-cyan-400",
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/20",
    desc: "KoNLPy + 정규표현식으로 형태소·URL·개체명을 분리합니다.",
  },
  {
    id: "encoder",
    icon: Brain,
    label: "인코더 (분석 모델)",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    desc: "토큰을 768차원 임베딩으로 변환. Attention으로 위험 패턴에 가중치를 부여합니다.",
  },
  {
    id: "decoder",
    icon: Eye,
    label: "디코더 / 분류기",
    color: "text-purple-400",
    bg: "bg-purple-500/10",
    border: "border-purple-500/20",
    desc: "인코더 출력을 바탕으로 피싱 여부를 판단하고 이유를 생성합니다.",
  },
  {
    id: "output",
    icon: Zap,
    label: "결과 출력",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    desc: "위험도 점수(1~10), 판단 이유, 디코더 인사이트를 사용자에게 반환합니다.",
  },
];

const ZERO_DAY_CASES = [
  {
    title: "도메인 하이픈 위장 패턴",
    description: "nhis.or.kr → nhis-pay.kr-notice.com",
    technique: "공식 도메인 일부를 포함한 서브도메인 생성으로 신뢰도 위장",
    detection: "도메인 구조 분석 + TLD 패턴 매칭으로 탐지",
    riskScore: 9,
  },
  {
    title: "긴급성 표현 조합 패턴",
    description: "'즉시' + '정지' + '납부' 동시 등장",
    technique: "단일 위험 키워드보다 복수 키워드 조합으로 심리적 압박 강화",
    detection: "컨텍스트 기반 Attention 가중치 분석으로 탐지",
    riskScore: 8,
  },
  {
    title: "공공기관명 + 비공식 번호 패턴",
    description: "010-XXXX-XXXX에서 '국민건강보험' 발신",
    technique: "공식 기관 명칭을 일반 번호로 발신해 진위 확인 어렵게 함",
    detection: "발신자 명칭-번호 불일치 패턴 탐지",
    riskScore: 7,
  },
];

/* ── 인터랙티브 토크나이저 ──────────────────────────────── */
function TokenizerDemo() {
  const [inputText, setInputText] = useState(EXAMPLE_TEXT);
  const [tokens, setTokens] = useState<{ token: string; type: string }[]>([]);
  const [running, setRunning] = useState(false);
  const [step, setStep] = useState(0);

  const runTokenizer = () => {
    if (running) return;
    setTokens([]);
    setStep(0);
    setRunning(true);
    const result = tokenize(inputText);
    result.forEach((t, i) => {
      setTimeout(() => {
        setTokens((prev) => [...prev, t]);
        setStep(i + 1);
        if (i === result.length - 1) setRunning(false);
      }, i * 80);
    });
  };

  const reset = () => {
    setTokens([]);
    setStep(0);
    setRunning(false);
  };

  return (
    <div className="bg-[#111c30] border border-white/10 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Layers size={14} className="text-cyan-400" />
        <p className="text-sm text-white/80" style={{ fontWeight: 500 }}>인터랙티브 토크나이저</p>
        <span className="text-[11px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">Live Demo</span>
      </div>

      <textarea
        value={inputText}
        onChange={(e) => { setInputText(e.target.value); reset(); }}
        rows={3}
        className="w-full bg-[#0b1120] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white/70 placeholder:text-white/20 outline-none resize-none mb-3"
        placeholder="분석할 문자를 입력하세요..."
      />

      <div className="flex gap-2 mb-4">
        <button
          onClick={runTokenizer}
          disabled={!inputText.trim() || running}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500/15 border border-cyan-500/25 text-cyan-400 text-xs hover:bg-cyan-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          {running ? (
            <div className="w-3 h-3 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
          ) : (
            <Play size={11} />
          )}
          토크나이저 실행
        </button>
        <button
          onClick={reset}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 text-white/40 text-xs hover:text-white/60 transition-all"
        >
          <RotateCcw size={11} /> 초기화
        </button>
      </div>

      {tokens.length > 0 && (
        <div>
          <div className="flex flex-wrap gap-1.5 mb-4">
            {tokens.map((t, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, scale: 0.8, y: 4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.15 }}
                className={`px-2 py-1 rounded-md text-xs border ${tokenStyles[t.type]}`}
              >
                {t.token}
              </motion.span>
            ))}
          </div>
          <div className="flex flex-wrap gap-3 text-[11px]">
            {Object.entries(tokenStyles).map(([type, cls]) => {
              const count = tokens.filter((t) => t.type === type).length;
              if (count === 0) return null;
              return (
                <span key={type} className="flex items-center gap-1.5">
                  <span className={`px-1.5 py-0.5 rounded border ${cls}`}>{type}</span>
                  <span className="text-white/30">{count}개</span>
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── 메인 페이지 ────────────────────────────────────────── */
export function ZeroDayExplainer() {
  const [activeStep, setActiveStep] = useState<string | null>(null);
  const [animating, setAnimating] = useState(false);

  const runPipeline = () => {
    if (animating) return;
    setAnimating(true);
    setActiveStep(null);
    PIPELINE_STEPS.forEach((s, i) => {
      setTimeout(() => {
        setActiveStep(s.id);
        if (i === PIPELINE_STEPS.length - 1) {
          setTimeout(() => setAnimating(false), 500);
        }
      }, i * 700);
    });
  };

  return (
    <div className="px-4 sm:px-6 py-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Cpu size={14} className="text-purple-400" />
          <span className="text-xs text-purple-400 tracking-widest uppercase">AI 탐지 원리</span>
        </div>
        <h1 className="text-white mb-1" style={{ fontWeight: 700, fontSize: "1.5rem" }}>제로데이 피싱 탐지 메커니즘</h1>
        <p className="text-sm text-white/40">
          기존 키워드 DB에 없는 새로운 패턴도 의미론적 분석으로 탐지하는 원리를 설명합니다.
        </p>
      </div>

      {/* Pipeline */}
      <div className="bg-[#111c30] border border-white/10 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-white/70" style={{ fontWeight: 500 }}>인코더-디코더 파이프라인</p>
          <button
            onClick={runPipeline}
            disabled={animating}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-500/15 border border-purple-500/25 text-purple-400 text-xs hover:bg-purple-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {animating ? (
              <div className="w-3 h-3 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
            ) : (
              <Play size={11} />
            )}
            파이프라인 시뮬레이션
          </button>
        </div>

        {/* Steps */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-0">
          {PIPELINE_STEPS.map((step, i) => (
            <div key={step.id} className="flex sm:flex-col items-center gap-3 sm:gap-0 flex-1">
              <motion.div
                animate={activeStep === step.id ? { scale: [1, 1.08, 1] } : {}}
                transition={{ duration: 0.3 }}
                onClick={() => setActiveStep(activeStep === step.id ? null : step.id)}
                className={`relative cursor-pointer rounded-xl p-4 border w-full sm:mx-1 transition-all ${
                  activeStep === step.id
                    ? `${step.bg} ${step.border} shadow-lg`
                    : "bg-white/3 border-white/8 hover:bg-white/5"
                }`}
              >
                {activeStep === step.id && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={`absolute inset-0 rounded-xl ${step.bg} blur-md -z-10`}
                  />
                )}
                <step.icon size={18} className={activeStep === step.id ? step.color : "text-white/30"} />
                <p className={`text-[11px] mt-2 ${activeStep === step.id ? step.color : "text-white/40"}`} style={{ fontWeight: 500 }}>
                  {step.label}
                </p>
              </motion.div>
              {i < PIPELINE_STEPS.length - 1 && (
                <ArrowRight size={14} className="shrink-0 text-white/20 sm:block hidden" />
              )}
            </div>
          ))}
        </div>

        {/* Step detail */}
        <AnimatePresence>
          {activeStep && (
            <motion.div
              key={activeStep}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-5 pt-5 border-t border-white/5"
            >
              {(() => {
                const s = PIPELINE_STEPS.find((p) => p.id === activeStep)!;
                return (
                  <div className={`flex items-start gap-3 p-3 rounded-lg ${s.bg} border ${s.border}`}>
                    <s.icon size={14} className={s.color} />
                    <p className="text-xs text-white/60 leading-relaxed">{s.desc}</p>
                  </div>
                );
              })()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Tokenizer Demo */}
      <TokenizerDemo />

      {/* Zero-day patterns */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Sparkles size={14} className="text-amber-400" />
          <p className="text-sm text-white/70" style={{ fontWeight: 500 }}>제로데이 탐지 패턴 사례</p>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">신규 위협</span>
        </div>
        <div className="space-y-3">
          {ZERO_DAY_CASES.map((c, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-[#111c30] border border-white/10 rounded-xl p-5"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-sm text-white/80" style={{ fontWeight: 500 }}>{c.title}</p>
                  <code className="text-xs text-amber-300/70 mt-0.5 block">{c.description}</code>
                </div>
                <span className="text-red-400 shrink-0 ml-3" style={{ fontWeight: 700, fontSize: "1.3rem" }}>
                  {c.riskScore}<span className="text-sm text-white/30">/10</span>
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/10">
                  <p className="text-[10px] text-red-400/60 mb-1">공격 기법</p>
                  <p className="text-xs text-white/50">{c.technique}</p>
                </div>
                <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                  <p className="text-[10px] text-emerald-400/60 mb-1">탐지 방법</p>
                  <p className="text-xs text-white/50">{c.detection}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Encoder vs Decoder explanation */}
      <div className="bg-[#111c30] border border-white/10 rounded-xl p-5">
        <p className="text-sm text-white/70 mb-4" style={{ fontWeight: 500 }}>인코더 vs 디코더 역할 차이</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/15">
            <div className="flex items-center gap-2 mb-3">
              <Brain size={15} className="text-blue-400" />
              <span className="text-sm text-blue-400" style={{ fontWeight: 500 }}>인코더 역할</span>
            </div>
            <ul className="space-y-2 text-xs text-white/50">
              <li className="flex items-start gap-2"><ChevronRight size={11} className="text-blue-400 mt-0.5 shrink-0" />문자의 의미를 수치 벡터로 압축</li>
              <li className="flex items-start gap-2"><ChevronRight size={11} className="text-blue-400 mt-0.5 shrink-0" />Attention으로 위험 토큰에 집중</li>
              <li className="flex items-start gap-2"><ChevronRight size={11} className="text-blue-400 mt-0.5 shrink-0" />제로데이 패턴도 의미 유사성으로 감지</li>
            </ul>
          </div>
          <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/15">
            <div className="flex items-center gap-2 mb-3">
              <Eye size={15} className="text-purple-400" />
              <span className="text-sm text-purple-400" style={{ fontWeight: 500 }}>디코더 역할</span>
            </div>
            <ul className="space-y-2 text-xs text-white/50">
              <li className="flex items-start gap-2"><ChevronRight size={11} className="text-purple-400 mt-0.5 shrink-0" />인코더 벡터를 바탕으로 피싱 판단</li>
              <li className="flex items-start gap-2"><ChevronRight size={11} className="text-purple-400 mt-0.5 shrink-0" />왜 피싱인지 이유를 자연어로 생성</li>
              <li className="flex items-start gap-2"><ChevronRight size={11} className="text-purple-400 mt-0.5 shrink-0" />위험도 점수 1~10 산출</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
