import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { FlaskConical, Shield, AlertTriangle, RefreshCw, Lock } from "lucide-react";
import { useAdmin } from "../context/AdminContext";

const EVASION_TECHNIQUES = [
  { id: "homoglyph", label: "동형자 치환", desc: "유사한 모양의 문자로 교체 (о→0, l→1, I→|)", example: (t: string) => t.replace(/o/gi, "0").replace(/a/gi, "а").replace(/e/gi, "е") },
  { id: "space", label: "공백 삽입", desc: "키워드 사이에 공백·특수문자 삽입", example: (t: string) => t.replace(/즉시/g, "즉 시").replace(/납부/g, "납 부").replace(/긴급/g, "긴 급") },
  { id: "punctuation", label: "구두점 우회", desc: "단어 사이에 마침표·쉼표 삽입", example: (t: string) => t.replace(/즉시/g, "즉.시").replace(/납부/g, "납.부") },
  { id: "url_shorten", label: "URL 단축", desc: "bit.ly 등 단축 URL로 원본 도메인 숨김", example: (t: string) => t.replace(/http:\/\/[^\s]+/g, "https://bit.ly/3xK9mPq") },
  { id: "no_url", label: "URL 제거", desc: "URL 없이 전화번호만 포함하여 URL 기반 탐지 우회", example: (t: string) => t.replace(/http:\/\/[^\s]+/g, "☎ 010-3892-4471로 연락 바랍니다.") },
  { id: "formal", label: "격식체 변환", desc: "긴급성 표현을 공손한 표현으로 완화", example: (t: string) => t.replace(/즉시/g, "빠른 시일 내에").replace(/경고/g, "안내 드립니다").replace(/정지됩니다/g, "조치될 수 있습니다") },
];

const SAMPLE_TEXTS = [
  "【국민건강보험】미납보험료 89,200원 즉시 납부 요청. 경고: 급여 정지. http://nhis-pay.kr",
  "귀하의 계좌가 긴급 동결됩니다. 즉시 클릭: http://kb-secure.xyz",
  "갤럭시S25 당첨! 즉시 수령 신청 → http://prize.xyz",
];

interface TestResult {
  original: { text: string; score: number };
  evaded: { text: string; score: number };
  delta: number;
  bypassed: boolean;
}

function mockScore(text: string): number {
  const risk = ["즉시", "긴급", "경고", "동결", "정지", "납부", "당첨", "클릭", "http://", "미납"].filter((k) => text.includes(k)).length;
  return Math.max(1, Math.min(10, Math.round(10 - risk * 0.4 + Math.random() * 0.6)));
}

export function RedTeam() {
  const { isAdmin, login } = useAdmin();
  const [pw, setPw] = useState("");
  const [pwError, setPwError] = useState(false);
  const [text, setText] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [result, setResult] = useState<TestResult | null>(null);
  const [running, setRunning] = useState(false);

  const handleLogin = () => {
    if (!login(pw)) { setPwError(true); setTimeout(() => setPwError(false), 2000); }
  };

  const applyEvasion = (original: string, ids: string[]): string => {
    let out = original;
    ids.forEach((id) => {
      const tech = EVASION_TECHNIQUES.find((t) => t.id === id);
      if (tech) out = tech.example(out);
    });
    return out;
  };

  const handleRun = () => {
    if (!text.trim() || selected.length === 0) return;
    setRunning(true);
    setTimeout(() => {
      const origScore = mockScore(text);
      const evaded = applyEvasion(text, selected);
      const evasionScore = mockScore(evaded);
      const adjustedScore = Math.max(1, evasionScore - Math.floor(selected.length * 0.8));
      setResult({
        original: { text, score: origScore },
        evaded: { text: evaded, score: adjustedScore },
        delta: origScore - adjustedScore,
        bypassed: adjustedScore < 5 && origScore >= 5,
      });
      setRunning(false);
    }, 1500);
  };

  if (!isAdmin) {
    return (
      <div className="px-4 sm:px-6 py-8 max-w-md mx-auto">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
            <Lock size={24} className="text-red-400" />
          </div>
          <h1 className="text-white mb-2" style={{ fontWeight: 700, fontSize: "1.3rem" }}>관리자 전용</h1>
          <p className="text-sm text-white/40">레드팀 테스트는 관리자 인증이 필요합니다.</p>
        </div>
        <div className="bg-[#111c30] border border-white/10 rounded-xl p-5">
          <p className="text-xs text-white/40 mb-3">관리자 비밀번호</p>
          <input type="password" value={pw} onChange={(e) => setPw(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            className={`w-full bg-[#0b1120] border rounded-xl px-3 py-2.5 text-sm text-white/80 outline-none mb-3 transition-all ${pwError ? "border-red-500/50" : "border-white/10 focus:border-red-500/30"}`}
            placeholder="비밀번호 입력..." />
          {pwError && <p className="text-xs text-red-400 mb-2">비밀번호가 틀렸습니다.</p>}
          <button onClick={handleLogin} className="w-full py-2.5 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 text-sm hover:bg-red-500/25 transition-all">
            인증
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 py-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <FlaskConical size={14} className="text-red-400" />
          <span className="text-xs text-red-400 tracking-widest uppercase">관리자 전용 · Red Team</span>
        </div>
        <h1 className="text-white mb-1" style={{ fontWeight: 700, fontSize: "1.5rem" }}>레드팀 테스트</h1>
        <p className="text-sm text-white/40">적대적 예제 생성으로 모델 취약점 및 탐지 우회 가능성을 분석합니다.</p>
        <div className="mt-3 p-3 rounded-xl bg-red-500/8 border border-red-500/20 flex gap-2">
          <AlertTriangle size={13} className="text-red-400 shrink-0 mt-0.5" />
          <p className="text-xs text-red-400/70">이 도구는 모델 강건성 연구 목적으로만 사용해야 합니다. 실제 피싱 문자 생성에 악용하지 마십시오.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Input & controls */}
        <div className="space-y-4">
          <div>
            <p className="text-xs text-white/40 mb-2">원본 피싱 문자</p>
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4}
              placeholder="테스트할 피싱 문자 입력..."
              className="w-full bg-[#111c30] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white/80 placeholder:text-white/20 outline-none resize-none focus:border-red-500/20 transition-all" />
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {SAMPLE_TEXTS.map((s, i) => (
                <button key={i} onClick={() => setText(s)}
                  className="text-[10px] px-2 py-1 rounded bg-white/5 border border-white/10 text-white/35 hover:text-red-400 hover:border-red-500/25 transition-all">
                  샘플 {i + 1}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs text-white/40 mb-2">우회 기법 선택</p>
            <div className="space-y-2">
              {EVASION_TECHNIQUES.map((tech) => (
                <label key={tech.id} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  selected.includes(tech.id) ? "bg-red-500/8 border-red-500/25" : "bg-[#111c30] border-white/8 hover:border-white/15"
                }`}>
                  <input type="checkbox" checked={selected.includes(tech.id)}
                    onChange={(e) => setSelected((p) => e.target.checked ? [...p, tech.id] : p.filter((x) => x !== tech.id))}
                    className="mt-0.5 accent-red-500" />
                  <div>
                    <p className="text-xs text-white/70" style={{ fontWeight: 500 }}>{tech.label}</p>
                    <p className="text-[11px] text-white/35">{tech.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <button onClick={handleRun} disabled={!text.trim() || selected.length === 0 || running}
            className="w-full py-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 text-sm hover:bg-red-500/25 transition-all disabled:opacity-40 flex items-center justify-center gap-2">
            {running ? <><div className="w-4 h-4 border border-red-400/30 border-t-red-400 rounded-full animate-spin" /> 우회 테스트 실행 중...</> : <><FlaskConical size={14} /> 우회 테스트 실행</>}
          </button>
        </div>

        {/* Result */}
        <div>
          <AnimatePresence>
            {result ? (
              <motion.div key="result" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                <div className={`p-4 rounded-xl border text-center ${result.bypassed ? "bg-red-500/10 border-red-500/30" : "bg-emerald-500/10 border-emerald-500/30"}`}>
                  <p className={`text-lg mb-1 ${result.bypassed ? "text-red-400" : "text-emerald-400"}`} style={{ fontWeight: 700 }}>
                    {result.bypassed ? "우회 성공" : "탐지 유지"}
                  </p>
                  <p className="text-xs text-white/40">{result.bypassed ? "모델이 피싱을 탐지하지 못했습니다." : "우회에도 불구하고 피싱이 탐지되었습니다."}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "원본 위험도", score: result.original.score, color: "text-red-400" },
                    { label: "우회 후 위험도", score: result.evaded.score, color: result.bypassed ? "text-emerald-400" : "text-red-400" },
                  ].map((s) => (
                    <div key={s.label} className="bg-[#111c30] border border-white/10 rounded-xl p-3 text-center">
                      <p className="text-[11px] text-white/30">{s.label}</p>
                      <p className={`text-2xl ${s.color}`} style={{ fontWeight: 700 }}>{s.score}<span className="text-xs text-white/30">/10</span></p>
                    </div>
                  ))}
                </div>

                <div className="bg-[#111c30] border border-white/10 rounded-xl p-4">
                  <p className="text-[11px] text-white/30 mb-2">우회 적용 결과</p>
                  <p className="text-xs text-white/65 leading-relaxed font-mono break-all">{result.evaded.text}</p>
                </div>

                <div className="bg-[#111c30] border border-white/10 rounded-xl p-4">
                  <p className="text-[11px] text-white/30 mb-2">점수 변화</p>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-red-400">{result.original.score}</span>
                    <div className="flex-1 h-1 bg-white/5 rounded-full relative">
                      <div className="absolute left-0 top-0 h-full rounded-full bg-emerald-400" style={{ width: `${(result.evaded.score / 10) * 100}%` }} />
                      <div className="absolute left-0 top-0 h-full rounded-full bg-red-400 opacity-30" style={{ width: `${(result.original.score / 10) * 100}%` }} />
                    </div>
                    <span className={`text-sm ${result.bypassed ? "text-emerald-400" : "text-red-400"}`}>{result.evaded.score}</span>
                  </div>
                  <p className="text-[11px] text-white/30 mt-1 text-center">△ {result.delta > 0 ? "-" : "+"}{Math.abs(result.delta)} 점 변화</p>
                </div>

                <button onClick={() => setResult(null)} className="flex items-center gap-1.5 text-xs text-white/35 hover:text-white/55 transition-all">
                  <RefreshCw size={11} /> 다시 테스트
                </button>
              </motion.div>
            ) : (
              <motion.div key="placeholder" className="h-64 bg-[#111c30] border border-white/8 border-dashed rounded-xl flex items-center justify-center">
                <div className="text-center">
                  <Shield size={28} className="text-white/10 mx-auto mb-2" />
                  <p className="text-xs text-white/20">우회 기법 선택 후 실행</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}