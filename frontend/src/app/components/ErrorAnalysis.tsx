import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Lock, Eye, EyeOff, AlertCircle, BarChart2,
  CheckCircle2, XCircle, MinusCircle, SlidersHorizontal, LogOut,
} from "lucide-react";
import { useAdmin } from "../context/AdminContext";

/* ── Confusion Matrix Data ──────────────────────────────── */
const CM = { tp: 9412, fp: 182, fn: 274, tn: 8731 };
const total = CM.tp + CM.fp + CM.fn + CM.tn;

const calcMetrics = (tp: number, fp: number, fn: number, tn: number) => ({
  accuracy: ((tp + tn) / (tp + fp + fn + tn)) * 100,
  precision: (tp / (tp + fp)) * 100,
  recall: (tp / (tp + fn)) * 100,
  specificity: (tn / (tn + fp)) * 100,
  f1: (2 * tp) / (2 * tp + fp + fn) * 100,
  fpr: (fp / (fp + tn)) * 100,
  fnr: (fn / (fn + tp)) * 100,
});

const FP_CASES = [
  { sender: "건강보험료 자동이체 안내", message: "보험료 자동이체 출금 예정 안내입니다. 계좌에 잔액을 확인해 주세요.", reason: "'출금', '확인' 키워드 오탐. 실제 정상 공지 문자.", category: "금융" },
  { sender: "GS25편의점", message: "긴급 이벤트! 오늘만 1+1 행사. 매장 방문 시 혜택 제공.", reason: "'긴급' 키워드로 이벤트 사기 패턴 오탐.", category: "이벤트" },
  { sender: "학교 행정실", message: "납부 기한 내 등록금 납부 바랍니다. 즉시 이체 부탁드립니다.", reason: "'즉시', '납부' 조합 오탐. 교육기관 정상 문자.", category: "교육" },
];

const FN_CASES = [
  { sender: "010-4821-3974", message: "고객님 대출 한도 조회 결과 최대 5천만원 가능합니다. 자세한 상담은 아래 링크에서.", reason: "저위험 URL 패턴 + 단순 문장으로 탐지 회피. 실제 대출 피싱.", category: "대출" },
  { sender: "CS센터", message: "포인트 만료 전 사용하세요. 잔여 포인트: 3,200P. 사용: bit.ly/use-pt", reason: "단축 URL 사용으로 위험 도메인 패턴 우회. 실제 피싱 링크.", category: "이벤트" },
  { sender: "카드사 고객센터", message: "해외 결제 승인 요청이 있었습니다. 본인 확인: 고객센터 직접 연락 바랍니다.", reason: "URL 미포함, 긴급어 적음. 전화 유도 피싱 (보이스피싱 연계).", category: "금융" },
];

function ConfusionMatrix({ tp, fp, fn, tn }: { tp: number; fp: number; fn: number; tn: number }) {
  const cells = [
    { label: "TP\n(진양성)", value: tp, color: "bg-emerald-500/20 border-emerald-500/30 text-emerald-400", sub: "피싱 → 피싱" },
    { label: "FP\n(위양성)", value: fp, color: "bg-orange-500/15 border-orange-500/25 text-orange-400", sub: "정상 → 피싱" },
    { label: "FN\n(위음성)", value: fn, color: "bg-red-500/20 border-red-500/30 text-red-400", sub: "피싱 → 정상" },
    { label: "TN\n(진음성)", value: tn, color: "bg-blue-500/15 border-blue-500/20 text-blue-400", sub: "정상 → 정상" },
  ];
  return (
    <div>
      <div className="grid grid-cols-2 gap-2 mb-3">
        {cells.map((c) => (
          <div key={c.sub} className={`rounded-xl p-4 border ${c.color} text-center`}>
            <p className={`text-xl`} style={{ fontWeight: 700 }}>{c.value.toLocaleString()}</p>
            <p className="text-[10px] opacity-70 whitespace-pre-line leading-tight mt-1">{c.label}</p>
            <p className="text-[10px] opacity-50 mt-0.5">{c.sub}</p>
          </div>
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-white/30">
        <span>예측: 피싱 / 예측: 정상</span>
        <span>전체 {total.toLocaleString()}건</span>
      </div>
    </div>
  );
}

/* ── 로그인 게이트 ──────────────────────────────────────── */
function LoginGate() {
  const { login } = useAdmin();
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!login(pw)) { setError(true); setShake(true); setPw(""); setTimeout(() => setShake(false), 500); }
  };

  return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center px-4">
      <motion.div animate={shake ? { x: [-8, 8, -6, 6, 0] } : {}} transition={{ duration: 0.4 }} className="w-full max-w-sm">
        <div className="bg-[#111c30] border border-white/10 rounded-2xl p-8">
          <div className="flex flex-col items-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center mb-3">
              <Lock size={22} className="text-amber-400" />
            </div>
            <h2 className="text-white" style={{ fontWeight: 700 }}>관리자 전용</h2>
            <p className="text-xs text-white/40 mt-1 text-center">오탐/미탐 분석은 관리자만 열람 가능합니다</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex items-center gap-2 px-3 py-2.5 bg-[#0b1120] border border-white/10 rounded-xl focus-within:border-amber-500/40 transition-all">
              <Lock size={12} className="text-white/25 shrink-0" />
              <input type={show ? "text" : "password"} value={pw} onChange={(e) => { setPw(e.target.value); setError(false); }}
                placeholder="비밀번호 입력" autoFocus className="flex-1 bg-transparent text-sm text-white/80 placeholder:text-white/20 outline-none" />
              <button type="button" onClick={() => setShow((s) => !s)}>{show ? <EyeOff size={12} className="text-white/30" /> : <Eye size={12} className="text-white/30" />}</button>
            </div>
            <AnimatePresence>{error && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-xs text-red-400 flex items-center gap-1"><AlertCircle size={11} />비밀번호가 틀렸습니다.</motion.p>}</AnimatePresence>
            <button type="submit" disabled={!pw} className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm disabled:opacity-40 hover:opacity-90 transition-all">로그인</button>
          </form>
          <p className="text-[11px] text-white/20 text-center mt-4">힌트: 관리자에게 문의하세요.</p>
        </div>
      </motion.div>
    </div>
  );
}

/* ── 메인 분석 대시보드 ─────────────────────────────────── */
function ErrorDashboard() {
  const { logout } = useAdmin();
  const [threshold, setThreshold] = useState(50);
  const [activeTab, setActiveTab] = useState<"matrix" | "fp" | "fn" | "threshold">("matrix");

  // Simulate threshold effect
  const scaledFP = Math.round(CM.fp * (1 + (50 - threshold) / 100));
  const scaledFN = Math.round(CM.fn * (1 - (50 - threshold) / 100));
  const scaledTP = CM.tp + (CM.fn - scaledFN);
  const scaledTN = CM.tn + (CM.fp - scaledFP);
  const m = calcMetrics(scaledTP, scaledFP, scaledFN, scaledTN);
  const baseM = calcMetrics(CM.tp, CM.fp, CM.fn, CM.tn);

  return (
    <div className="px-4 sm:px-6 py-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Lock size={12} className="text-amber-400" />
            <span className="text-xs text-amber-400 tracking-widest uppercase">관리자 전용</span>
          </div>
          <h1 className="text-white" style={{ fontWeight: 700, fontSize: "1.5rem" }}>오탐 / 미탐 분석</h1>
          <p className="text-sm text-white/40">False Positive · False Negative 케이스 분석 및 임계값 조정</p>
        </div>
        <button onClick={logout} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 text-xs text-white/40 hover:text-red-400 hover:border-red-500/30 transition-all">
          <LogOut size={12} /> 로그아웃
        </button>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "정확도", value: `${baseM.accuracy.toFixed(1)}%`, icon: CheckCircle2, color: "text-emerald-400" },
          { label: "정밀도 (Precision)", value: `${baseM.precision.toFixed(1)}%`, icon: BarChart2, color: "text-cyan-400" },
          { label: "재현율 (Recall)", value: `${baseM.recall.toFixed(1)}%`, icon: BarChart2, color: "text-blue-400" },
          { label: "F1 Score", value: `${baseM.f1.toFixed(1)}%`, icon: BarChart2, color: "text-purple-400" },
        ].map((c) => (
          <div key={c.label} className="bg-[#111c30] border border-white/10 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <c.icon size={13} className={c.color} />
              <p className="text-[11px] text-white/35">{c.label}</p>
            </div>
            <p className={`${c.color}`} style={{ fontWeight: 700, fontSize: "1.4rem" }}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#0b1120] border border-white/10 rounded-xl p-1 w-fit flex-wrap">
        {[
          { key: "matrix", label: "혼동 행렬" },
          { key: "fp", label: "오탐 사례 (FP)" },
          { key: "fn", label: "미탐 사례 (FN)" },
          { key: "threshold", label: "임계값 조정" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key as typeof activeTab)}
            className={`px-4 py-2 rounded-lg text-xs transition-all ${
              activeTab === t.key ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "text-white/40 hover:text-white/60"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "matrix" && (
          <motion.div key="matrix" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-[#111c30] border border-white/10 rounded-xl p-5">
              <p className="text-sm text-white/70 mb-1" style={{ fontWeight: 500 }}>혼동 행렬 (Confusion Matrix)</p>
              <p className="text-xs text-white/30 mb-4">현재 임계값 {threshold}% 기준</p>
              <ConfusionMatrix tp={scaledTP} fp={scaledFP} fn={scaledFN} tn={scaledTN} />
            </div>
            <div className="bg-[#111c30] border border-white/10 rounded-xl p-5 space-y-4">
              <p className="text-sm text-white/70 mb-1" style={{ fontWeight: 500 }}>핵심 오류 지표</p>
              {[
                { label: "FPR (오탐율)", value: `${m.fpr.toFixed(2)}%`, desc: "정상 문자를 피싱으로 잘못 분류", color: "text-orange-400", bg: "bg-orange-500/10" },
                { label: "FNR (미탐율)", value: `${m.fnr.toFixed(2)}%`, desc: "피싱 문자를 정상으로 놓침", color: "text-red-400", bg: "bg-red-500/10" },
                { label: "특이도", value: `${m.specificity.toFixed(1)}%`, desc: "정상 문자를 정확히 분류하는 능력", color: "text-cyan-400", bg: "bg-cyan-500/10" },
              ].map((s) => (
                <div key={s.label} className={`flex items-start gap-3 p-3 rounded-xl ${s.bg} border border-white/10`}>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className={`text-sm ${s.color}`} style={{ fontWeight: 600 }}>{s.value}</p>
                      <p className="text-[11px] text-white/50">{s.label}</p>
                    </div>
                    <p className="text-[11px] text-white/30 mt-0.5">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === "fp" && (
          <motion.div key="fp" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="mb-4 p-3 rounded-xl bg-orange-500/5 border border-orange-500/15">
              <p className="text-xs text-orange-300/70">
                <strong className="text-orange-300/80">오탐 (False Positive)</strong>: 정상 문자를 피싱으로 잘못 분류한 케이스입니다. 사용자 불편을 초래할 수 있어 개선이 필요합니다.
              </p>
            </div>
            <div className="space-y-3">
              {FP_CASES.map((c, i) => (
                <div key={i} className="bg-[#111c30] border border-orange-500/15 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <XCircle size={13} className="text-orange-400" />
                    <span className="text-xs text-orange-400" style={{ fontWeight: 500 }}>오탐 케이스 #{i + 1}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 border border-white/10 text-white/40 ml-auto">{c.category}</span>
                  </div>
                  <p className="text-xs text-white/30 mb-1">발신: {c.sender}</p>
                  <p className="text-sm text-white/70 mb-3 leading-relaxed">{c.message}</p>
                  <div className="p-2.5 rounded-lg bg-orange-500/8 border border-orange-500/15">
                    <p className="text-[11px] text-orange-300/60">오탐 원인: {c.reason}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 p-4 rounded-xl bg-[#111c30] border border-white/10">
              <p className="text-sm text-white/60 mb-2" style={{ fontWeight: 500 }}>개선 방향</p>
              <ul className="space-y-1.5 text-xs text-white/40">
                <li className="flex items-start gap-2"><CheckCircle2 size={11} className="text-emerald-400 mt-0.5 shrink-0" />공신력 있는 발신 번호 화이트리스트 확장</li>
                <li className="flex items-start gap-2"><CheckCircle2 size={11} className="text-emerald-400 mt-0.5 shrink-0" />문맥 기반 긴급어 판단 강화 (단순 키워드 탈피)</li>
                <li className="flex items-start gap-2"><CheckCircle2 size={11} className="text-emerald-400 mt-0.5 shrink-0" />교육/공공기관 도메인 패턴 추가 학습</li>
              </ul>
            </div>
          </motion.div>
        )}

        {activeTab === "fn" && (
          <motion.div key="fn" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="mb-4 p-3 rounded-xl bg-red-500/5 border border-red-500/15">
              <p className="text-xs text-red-300/70">
                <strong className="text-red-300/80">미탐 (False Negative)</strong>: 피싱 문자를 정상으로 놓친 케이스입니다. 실제 피해로 이어질 수 있어 가장 위험한 오류 유형입니다.
              </p>
            </div>
            <div className="space-y-3">
              {FN_CASES.map((c, i) => (
                <div key={i} className="bg-[#111c30] border border-red-500/20 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <MinusCircle size={13} className="text-red-400" />
                    <span className="text-xs text-red-400" style={{ fontWeight: 500 }}>미탐 케이스 #{i + 1}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 border border-white/10 text-white/40 ml-auto">{c.category}</span>
                  </div>
                  <p className="text-xs text-white/30 mb-1">발신: {c.sender}</p>
                  <p className="text-sm text-white/70 mb-3 leading-relaxed">{c.message}</p>
                  <div className="p-2.5 rounded-lg bg-red-500/8 border border-red-500/15">
                    <p className="text-[11px] text-red-300/60">미탐 원인: {c.reason}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 p-4 rounded-xl bg-[#111c30] border border-white/10">
              <p className="text-sm text-white/60 mb-2" style={{ fontWeight: 500 }}>개선 방향</p>
              <ul className="space-y-1.5 text-xs text-white/40">
                <li className="flex items-start gap-2"><CheckCircle2 size={11} className="text-emerald-400 mt-0.5 shrink-0" />단축 URL 자동 전개 및 최종 도메인 검증 추가</li>
                <li className="flex items-start gap-2"><CheckCircle2 size={11} className="text-emerald-400 mt-0.5 shrink-0" />전화 유도 패턴(보이스피싱 연계) 학습 데이터 확충</li>
                <li className="flex items-start gap-2"><CheckCircle2 size={11} className="text-emerald-400 mt-0.5 shrink-0" />비명시적 압박 표현 컨텍스트 모델링 강화</li>
              </ul>
            </div>
          </motion.div>
        )}

        {activeTab === "threshold" && (
          <motion.div key="threshold" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="bg-[#111c30] border border-white/10 rounded-xl p-5 mb-4">
              <div className="flex items-center gap-2 mb-4">
                <SlidersHorizontal size={14} className="text-amber-400" />
                <p className="text-sm text-white/70" style={{ fontWeight: 500 }}>분류 임계값 (Threshold) 조정</p>
                <span className="ml-auto text-amber-400 text-sm" style={{ fontWeight: 700 }}>{threshold}%</span>
              </div>
              <input
                type="range" min={10} max={90} value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="w-full accent-amber-400 mb-2"
              />
              <div className="flex justify-between text-[10px] text-white/25">
                <span>10% (보수적 — 오탐↑ 미탐↓)</span>
                <span>90% (관대적 — 오탐↓ 미탐↑)</span>
              </div>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
              {[
                { label: "정확도", cur: m.accuracy, base: baseM.accuracy, color: "text-emerald-400" },
                { label: "정밀도", cur: m.precision, base: baseM.precision, color: "text-cyan-400" },
                { label: "재현율", cur: m.recall, base: baseM.recall, color: "text-blue-400" },
                { label: "F1", cur: m.f1, base: baseM.f1, color: "text-purple-400" },
              ].map((s) => {
                const diff = s.cur - s.base;
                return (
                  <div key={s.label} className="bg-[#111c30] border border-white/10 rounded-xl p-3">
                    <p className="text-[11px] text-white/35 mb-1">{s.label}</p>
                    <p className={`${s.color} text-lg`} style={{ fontWeight: 700 }}>{s.cur.toFixed(1)}%</p>
                    <p className={`text-[10px] ${diff > 0 ? "text-emerald-400" : diff < 0 ? "text-red-400" : "text-white/30"}`}>
                      {diff > 0 ? "▲" : diff < 0 ? "▼" : "–"} {Math.abs(diff).toFixed(1)}%
                    </p>
                  </div>
                );
              })}
            </div>
            <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/15">
              <p className="text-xs text-blue-300/60 leading-relaxed">
                임계값을 낮추면 더 많은 문자를 피싱으로 분류해 <strong className="text-blue-300/80">재현율이 높아지지만 오탐율도 증가</strong>합니다.
                현재 운영 임계값 <strong className="text-blue-300/80">50%</strong>는 F1 점수를 최대화하는 지점입니다.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function ErrorAnalysis() {
  const { isAdmin } = useAdmin();
  return isAdmin ? <ErrorDashboard /> : <LoginGate />;
}