import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Settings2, Bell, Shield, Cpu, Download, RefreshCw, Check, Moon, Sun, Globe, SlidersHorizontal } from "lucide-react";

interface SettingsState {
  threshold: number;
  model: string;
  notifications: { highRisk: boolean; weeklyReport: boolean; newPattern: boolean };
  exportFormat: string;
  language: string;
  sensitivity: string;
  autoDelete: boolean;
  showScore: boolean;
  compactMode: boolean;
}

const DEFAULT: SettingsState = {
  threshold: 50,
  model: "kcelectra-base-v2022",
  notifications: { highRisk: true, weeklyReport: false, newPattern: true },
  exportFormat: "json",
  language: "ko",
  sensitivity: "balanced",
  autoDelete: false,
  showScore: true,
  compactMode: false,
};

function load(): SettingsState {
  try {
    const saved = localStorage.getItem("newbiz-settings");
    return saved ? { ...DEFAULT, ...JSON.parse(saved) } : DEFAULT;
  } catch { return DEFAULT; }
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-10 h-5.5 rounded-full transition-all duration-200 ${checked ? "bg-cyan-500" : "bg-white/15"}`}
      style={{ height: "22px" }}
    >
      <motion.div
        animate={{ x: checked ? 20 : 2 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm"
      />
    </button>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="bg-[#111c30] border border-white/10 rounded-xl overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-white/8">
        <Icon size={14} className="text-white/40" />
        <p className="text-sm text-white/70" style={{ fontWeight: 500 }}>{title}</p>
      </div>
      <div className="divide-y divide-white/5">{children}</div>
    </div>
  );
}

function Row({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5 gap-4">
      <div>
        <p className="text-sm text-white/70">{label}</p>
        {desc && <p className="text-[11px] text-white/30 mt-0.5">{desc}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export function Settings() {
  const [cfg, setCfg] = useState<SettingsState>(load);
  const [saved, setSaved] = useState(false);

  const update = <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => {
    setCfg((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    localStorage.setItem("newbiz-settings", JSON.stringify(cfg));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    setCfg(DEFAULT);
    localStorage.removeItem("newbiz-settings");
  };

  const thresholdLabel = cfg.threshold < 30 ? "보수적 (오탐 증가)" : cfg.threshold < 60 ? "균형 (권장)" : "관대적 (미탐 증가)";

  return (
    <div className="px-4 sm:px-6 py-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Settings2 size={14} className="text-slate-400" />
          <span className="text-xs text-slate-400 tracking-widest uppercase">환경 설정</span>
        </div>
        <h1 className="text-white mb-1" style={{ fontWeight: 700, fontSize: "1.5rem" }}>설정</h1>
        <p className="text-sm text-white/40">분석 파라미터, 알림, 인터페이스 설정을 관리합니다.</p>
      </div>

      <div className="space-y-4">
        {/* Analysis settings */}
        <Section title="분석 설정" icon={SlidersHorizontal}>
          <div className="px-5 py-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-sm text-white/70">분류 임계값 (Threshold)</p>
                <p className="text-[11px] text-white/30 mt-0.5">낮을수록 더 많은 문자가 피싱으로 분류됩니다</p>
              </div>
              <div className="text-right shrink-0 ml-4">
                <p className="text-sm text-cyan-400" style={{ fontWeight: 700 }}>{cfg.threshold}%</p>
                <p className="text-[10px] text-white/30">{thresholdLabel}</p>
              </div>
            </div>
            <input type="range" min={10} max={90} value={cfg.threshold}
              onChange={(e) => update("threshold", Number(e.target.value))}
              className="w-full accent-cyan-400 mt-1" />
            <div className="flex justify-between text-[10px] text-white/20 mt-1">
              <span>보수적 (10)</span><span>균형 (50)</span><span>관대적 (90)</span>
            </div>
          </div>

          <Row label="민감도 프리셋" desc="사전 정의된 임계값 조합">
            <div className="flex gap-1">
              {[
                { key: "strict", label: "엄격", val: 25 },
                { key: "balanced", label: "균형", val: 50 },
                { key: "lenient", label: "완화", val: 75 },
              ].map((s) => (
                <button key={s.key}
                  onClick={() => { update("sensitivity", s.key); update("threshold", s.val); }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] border transition-all ${
                    cfg.sensitivity === s.key ? "bg-cyan-500/20 border-cyan-500/30 text-cyan-400" : "border-white/10 text-white/40 hover:text-white/60"
                  }`}>{s.label}</button>
              ))}
            </div>
          </Row>

          <Row label="AI 모델 선택" desc="분석에 사용할 모델">
            <select value={cfg.model} onChange={(e) => update("model", e.target.value)}
              className="bg-[#0b1120] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white/70 outline-none focus:border-cyan-500/30 transition-all">
              <option value="kcelectra-base-v2022">모델 미정</option>
              <option value="kcelectra-small-v2022">모델 미정(소형)</option>
              <option value="kobert-base">KoBERT-base</option>
            </select>
          </Row>
        </Section>

        {/* Notification settings */}
        <Section title="알림 설정" icon={Bell}>
          <Row label="HIGH 위험 탐지 알림" desc="HIGH 등급 탐지 시 즉시 알림">
            <Toggle checked={cfg.notifications.highRisk}
              onChange={(v) => update("notifications", { ...cfg.notifications, highRisk: v })} />
          </Row>
          <Row label="주간 리포트 알림" desc="매주 월요일 요약 리포트 수신">
            <Toggle checked={cfg.notifications.weeklyReport}
              onChange={(v) => update("notifications", { ...cfg.notifications, weeklyReport: v })} />
          </Row>
          <Row label="신규 피싱 패턴 알림" desc="패턴 DB 업데이트 시 알림">
            <Toggle checked={cfg.notifications.newPattern}
              onChange={(v) => update("notifications", { ...cfg.notifications, newPattern: v })} />
          </Row>
        </Section>

        {/* Display settings */}
        <Section title="인터페이스 설정" icon={Moon}>
          <Row label="위험도 점수 표시" desc="분석 결과에 숫자 점수 표시">
            <Toggle checked={cfg.showScore} onChange={(v) => update("showScore", v)} />
          </Row>
          <Row label="컴팩트 모드" desc="리스트 항목 간격을 줄여 더 많이 표시">
            <Toggle checked={cfg.compactMode} onChange={(v) => update("compactMode", v)} />
          </Row>
          <Row label="분석 이력 자동 삭제" desc="30일 이후 이력 자동 삭제">
            <Toggle checked={cfg.autoDelete} onChange={(v) => update("autoDelete", v)} />
          </Row>
          <Row label="언어">
            <select value={cfg.language} onChange={(e) => update("language", e.target.value)}
              className="bg-[#0b1120] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white/70 outline-none focus:border-cyan-500/30 transition-all">
              <option value="ko">한국어</option>
              <option value="en">English</option>
            </select>
          </Row>
        </Section>

        {/* Export settings */}
        <Section title="내보내기 설정" icon={Download}>
          <Row label="기본 내보내기 형식" desc="리포트 다운로드 기본 형식">
            <div className="flex gap-1">
              {["json", "pdf", "csv"].map((fmt) => (
                <button key={fmt}
                  onClick={() => update("exportFormat", fmt)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] border uppercase transition-all ${
                    cfg.exportFormat === fmt ? "bg-cyan-500/20 border-cyan-500/30 text-cyan-400" : "border-white/10 text-white/40 hover:text-white/60"
                  }`}>{fmt}</button>
              ))}
            </div>
          </Row>
        </Section>

        {/* Action buttons */}
        <div className="flex items-center gap-3 pt-2">
          <button onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-sm shadow-lg shadow-cyan-500/20 hover:opacity-90 transition-all">
            <AnimatePresence mode="wait">
              {saved
                ? <motion.span key="saved" initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-1.5"><Check size={13} /> 저장됨!</motion.span>
                : <motion.span key="save" className="flex items-center gap-1.5"><Shield size={13} /> 설정 저장</motion.span>
              }
            </AnimatePresence>
          </button>
          <button onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 text-white/40 text-sm hover:text-white/60 hover:border-white/20 transition-all">
            <RefreshCw size={12} /> 초기화
          </button>
        </div>
      </div>
    </div>
  );
}
