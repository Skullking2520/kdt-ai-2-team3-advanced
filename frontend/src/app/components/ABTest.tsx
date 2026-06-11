import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { FlaskConical, Lock, Play, RefreshCw, Cpu } from "lucide-react";
import { useAdmin } from "../context/AdminContext";

const MODELS = [
  { id: "kcelectra", name: "모델 미정", speed: 142, accuracy: 0, color: "#22d3ee" },
  { id: "kobert", name: "KoBERT-base", speed: 221, accuracy: 93.1, color: "#a78bfa" },
  { id: "kcelectra-small", name: "모델 미정(소형)", speed: 89, accuracy: 0, color: "#fb923c" },
];

const RISK_KW = ["즉시", "긴급", "정지", "동결", "납부", "미납", "경고", "당첨", "소멸", "혐의", "체포", "대출", "클릭"];
function mockModel(text: string, model: typeof MODELS[0]) {
  const hits = RISK_KW.filter((k) => text.includes(k)).length;
  const hasUrl = /http/i.test(text);
  const base = hits * 1.5 + (hasUrl ? 2 : 0);
  const noise = (model.accuracy / 100) * (Math.random() * 1.5);
  const score = Math.max(1, Math.min(10, Math.round(base + noise)));
  const level = score >= 7 ? "HIGH" : score >= 4 ? "MEDIUM" : "LOW";
  const confidence = Math.min(0.99, (model.accuracy / 100) * (0.85 + Math.random() * 0.12));
  const reasons = [];
  if (hits > 0) reasons.push(`위험 키워드 ${hits}개`);
  if (hasUrl) reasons.push("의심 URL");
  if (text.includes("【")) reasons.push("기관 사칭 형식");
  if (reasons.length === 0) reasons.push("정상 패턴");
  return { score, level, confidence, reasons, latency: model.speed + Math.floor(Math.random() * 40 - 20) };
}

const SAMPLES = [
  "【국민건강보험】미납보험료 89,200원 즉시 납부. http://nhis-pay.kr",
  "[SKT] 5월 요금 38,500원 청구. tworld.co.kr 확인",
  "갤럭시S25 당첨! 즉시 수령 → http://prize.xyz",
];

const LEVEL_COLOR: { [k: string]: { text: string; bar: string; bg: string; border: string } } = {
  HIGH: { text: "text-red-400", bar: "#ef4444", bg: "bg-red-500/8", border: "border-red-500/20" },
  MEDIUM: { text: "text-amber-400", bar: "#f97316", bg: "bg-amber-500/8", border: "border-amber-500/20" },
  LOW: { text: "text-emerald-400", bar: "#22c55e", bg: "bg-emerald-500/8", border: "border-emerald-500/20" },
};

export function ABTest() {
  const { isAdmin, login } = useAdmin();
  const [pw, setPw] = useState("");
  const [pwError, setPwError] = useState(false);
  const [text, setText] = useState("");
  const [modelA, setModelA] = useState("kcelectra");
  const [modelB, setModelB] = useState("kobert");
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<{ a: ReturnType<typeof mockModel>; b: ReturnType<typeof mockModel> } | null>(null);

  const handleLogin = () => {
    if (!login(pw)) { setPwError(true); setTimeout(() => setPwError(false), 2000); }
  };

  const handleRun = () => {
    if (!text.trim()) return;
    setRunning(true);
    setResults(null);
    const mA = MODELS.find((m) => m.id === modelA)!;
    const mB = MODELS.find((m) => m.id === modelB)!;
    setTimeout(() => {
      setResults({ a: mockModel(text, mA), b: mockModel(text, mB) });
      setRunning(false);
    }, Math.max(mA.speed, mB.speed) + 300);
  };

  if (!isAdmin) {
    return (
      <div className="px-4 sm:px-6 py-8 max-w-md mx-auto">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mx-auto mb-4">
            <Lock size={24} className="text-violet-400" />
          </div>
          <h1 className="text-white mb-2" style={{ fontWeight: 700, fontSize: "1.3rem" }}>관리자 전용</h1>
          <p className="text-sm text-white/40">A/B 테스트는 관리자 인증이 필요합니다.</p>
        </div>
        <div className="bg-[#111c30] border border-white/10 rounded-xl p-5">
          <p className="text-xs text-white/40 mb-3">관리자 비밀번호</p>
          <input type="password" value={pw} onChange={(e) => setPw(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            className={`w-full bg-[#0b1120] border rounded-xl px-3 py-2.5 text-sm text-white/80 outline-none mb-3 transition-all ${pwError ? "border-red-500/50" : "border-white/10 focus:border-violet-500/30"}`}
            placeholder="비밀번호 입력..." />
          {pwError && <p className="text-xs text-red-400 mb-2">비밀번호가 틀렸습니다.</p>}
          <button onClick={handleLogin} className="w-full py-2.5 rounded-xl bg-violet-500/20 border border-violet-500/30 text-violet-400 text-sm hover:bg-violet-500/25 transition-all">인증</button>
        </div>
      </div>
    );
  }

  const mA = MODELS.find((m) => m.id === modelA)!;
  const mB = MODELS.find((m) => m.id === modelB)!;

  return (
    <div className="px-4 sm:px-6 py-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <FlaskConical size={14} className="text-violet-400" />
          <span className="text-xs text-violet-400 tracking-widest uppercase">관리자 전용 · A/B 테스트</span>
        </div>
        <h1 className="text-white mb-1" style={{ fontWeight: 700, fontSize: "1.5rem" }}>모델 A/B 테스트</h1>
        <p className="text-sm text-white/40">두 모델에 동일한 입력을 넣고 결과를 나란히 비교합니다.</p>
      </div>

      {/* Model selector */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {[
          { label: "모델 A", val: modelA, set: setModelA, color: "border-cyan-500/30 text-cyan-400" },
          { label: "모델 B", val: modelB, set: setModelB, color: "border-violet-500/30 text-violet-400" },
        ].map((s) => (
          <div key={s.label} className="bg-[#111c30] border border-white/10 rounded-xl p-3">
            <p className="text-[11px] text-white/30 mb-2">{s.label}</p>
            <div className="space-y-1.5">
              {MODELS.map((m) => (
                <label key={m.id} className={`flex items-center gap-2 cursor-pointer p-2 rounded-lg border transition-all ${
                  s.val === m.id ? `border-white/15 bg-white/5` : "border-transparent hover:bg-white/3"
                }`}>
                  <input type="radio" name={s.label} value={m.id} checked={s.val === m.id}
                    onChange={() => s.set(m.id)} className="accent-violet-500" />
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: m.color }} />
                  <div>
                    <p className="text-[11px] text-white/65">{m.name}</p>
                    <p className="text-[10px] text-white/25">{m.accuracy}% · {m.speed}ms</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="bg-[#111c30] border border-white/10 rounded-xl p-4 mb-4">
        <p className="text-xs text-white/40 mb-2">테스트 문자</p>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3}
          placeholder="분석할 SMS 문자 입력..."
          className="w-full bg-transparent text-sm text-white/75 placeholder:text-white/20 outline-none resize-none" />
        <div className="flex gap-1.5 mt-2 pt-2 border-t border-white/5 flex-wrap">
          <p className="text-[10px] text-white/25">샘플:</p>
          {SAMPLES.map((s, i) => (
            <button key={i} onClick={() => setText(s)}
              className="text-[10px] px-2 py-0.5 rounded bg-white/5 border border-white/10 text-white/35 hover:text-violet-400 hover:border-violet-500/25 transition-all">
              샘플 {i + 1}
            </button>
          ))}
        </div>
      </div>

      <button onClick={handleRun} disabled={!text.trim() || running || modelA === modelB}
        className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white text-sm disabled:opacity-40 hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-violet-500/15 mb-6">
        {running ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> 양쪽 모델 실행 중...</>
          : <><Play size={14} /> A/B 동시 실행</>}
      </button>
      {modelA === modelB && <p className="text-center text-xs text-amber-400 -mt-4 mb-4">서로 다른 모델을 선택해주세요.</p>}

      <AnimatePresence>
        {results && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
            {/* Side by side results */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {[
                { label: "모델 A", model: mA, r: results.a },
                { label: "모델 B", model: mB, r: results.b },
              ].map(({ label, model, r }) => {
                const lc = LEVEL_COLOR[r.level];
                return (
                  <div key={label} className={`rounded-xl border p-5 ${lc.bg} ${lc.border}`}>
                    <div className="flex items-center gap-2 mb-3">
                      <Cpu size={13} style={{ color: model.color }} />
                      <p className="text-xs text-white/60" style={{ fontWeight: 500 }}>{label}: {model.name}</p>
                    </div>
                    <div className="flex items-end gap-3 mb-3">
                      <p className={`text-4xl ${lc.text}`} style={{ fontWeight: 800 }}>{r.score}</p>
                      <div>
                        <p className={`text-sm ${lc.text}`} style={{ fontWeight: 600 }}>{r.level}</p>
                        
                      </div>
                    </div>
                    <div className="h-2 rounded-full bg-white/8 overflow-hidden mb-3">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${r.score * 10}%` }} transition={{ duration: 0.7 }}
                        className="h-full rounded-full" style={{ backgroundColor: lc.bar, opacity: 0.8 }} />
                    </div>
                    <div className="space-y-1">
                      {r.reasons.map((reason, i) => (
                        <p key={i} className="text-[11px] text-white/50 flex items-center gap-1.5">
                          <span className="w-1 h-1 rounded-full bg-white/20 shrink-0" />{reason}
                        </p>
                      ))}
                    </div>
                    <div className="mt-3 pt-3 border-t border-white/8 flex items-center justify-between">
                      <span className="text-[11px] text-white/30">처리 시간</span>
                      <span className="text-[11px] text-white/50 font-mono">{r.latency}ms</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Comparison summary */}
            <div className="bg-[#111c30] border border-white/10 rounded-xl p-5">
              <p className="text-sm text-white/70 mb-4" style={{ fontWeight: 500 }}>비교 요약</p>
              <div className="space-y-3">
                {[
                  {
                    label: "위험도 점수",
                    a: `${results.a.score}/10`,
                    b: `${results.b.score}/10`,
                    winner: results.a.score !== results.b.score ? (results.a.score > results.b.score ? "A" : "B") : "동일",
                  },
                  {
                    label: "신뢰도",
                    a: `${(results.a.confidence * 100).toFixed(1)}%`,
                    b: `${(results.b.confidence * 100).toFixed(1)}%`,
                    winner: results.a.confidence > results.b.confidence ? "A" : results.b.confidence > results.a.confidence ? "B" : "동일",
                  },
                  {
                    label: "처리 속도",
                    a: `${results.a.latency}ms`,
                    b: `${results.b.latency}ms`,
                    winner: results.a.latency < results.b.latency ? "A 빠름" : results.b.latency < results.a.latency ? "B 빠름" : "동일",
                  },
                  {
                    label: "판정",
                    a: results.a.level,
                    b: results.b.level,
                    winner: results.a.level === results.b.level ? "일치" : "불일치",
                  },
                ].map((row) => (
                  <div key={row.label} className="flex items-center gap-3 py-2 border-b border-white/5">
                    <span className="text-[11px] text-white/35 w-20 shrink-0">{row.label}</span>
                    <span className="text-xs text-cyan-400 flex-1 text-center">{row.a}</span>
                    <span className="text-[10px] text-white/20 px-2 py-0.5 rounded bg-white/5 shrink-0">{row.winner}</span>
                    <span className="text-xs text-violet-400 flex-1 text-center">{row.b}</span>
                  </div>
                ))}
              </div>
            </div>

            <button onClick={() => { setResults(null); }}
              className="flex items-center gap-1.5 text-xs text-white/35 hover:text-white/55 transition-all">
              <RefreshCw size={11} /> 다시 테스트
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
