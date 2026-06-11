import { motion } from "motion/react";
import { Database, Info, CheckCircle2, GitBranch } from "lucide-react";

const SOURCES = [
  { name: "KISA 스팸 신고 데이터", count: 12400, pct: 37, color: "#3b82f6" },
  { name: "공공데이터포털 피싱 DB", count: 9870, pct: 29, color: "#22c55e" },
  { name: "직접 수집 (크롤링)", count: 6720, pct: 20, color: "#f59e0b" },
  { name: "사용자 신고 데이터", count: 3310, pct: 10, color: "#a78bfa" },
  { name: "합성 데이터 (증강)", count: 1400, pct: 4, color: "#fb7185" },
];

const CLASS_DIST = [
  { label: "피싱 문자", count: 16850, pct: 50.2, color: "#ef4444" },
  { label: "정상 문자", count: 16850, pct: 49.8, color: "#22c55e" },
];

const CATEGORIES = [
  { name: "공공기관 사칭", count: 4120, pct: 24.5 },
  { name: "금융 피싱", count: 3890, pct: 23.1 },
  { name: "택배 사기", count: 2670, pct: 15.9 },
  { name: "이벤트 사기", count: 2210, pct: 13.1 },
  { name: "대출 사기", count: 1980, pct: 11.8 },
  { name: "기타 피싱", count: 1980, pct: 11.7 },
];

const PIPELINE = [
  { step: "1. 수집", desc: "KISA·공공데이터·크롤링·사용자 신고", color: "border-blue-500/30 bg-blue-500/8" },
  { step: "2. 정제", desc: "중복 제거·인코딩 정규화·이모지 처리", color: "border-violet-500/30 bg-violet-500/8" },
  { step: "3. 레이블링", desc: "전문가 검수 + 규칙 기반 1차 분류", color: "border-cyan-500/30 bg-cyan-500/8" },
  { step: "4. 증강", desc: "동의어 치환·노이즈 삽입·역번역", color: "border-amber-500/30 bg-amber-500/8" },
  { step: "5. 분할", desc: "Train 80% / Val 10% / Test 10%", color: "border-emerald-500/30 bg-emerald-500/8" },
  { step: "6. 토크나이징", desc: "KcBERT WordPiece 적용", color: "border-red-500/30 bg-red-500/8" },
];

const SAMPLES = [
  { text: "【국민건강보험】미납보험료 89,200원 즉시 납부 → http://nhis-pay.kr", label: "PHISHING", cat: "공공기관 사칭", color: "text-red-400", bg: "bg-red-500/8", border: "border-red-500/20" },
  { text: "[SKT] 5월 이용요금 38,500원이 청구되었습니다. T월드(www.tworld.co.kr)에서 확인하세요.", label: "NORMAL", cat: "정상", color: "text-emerald-400", bg: "bg-emerald-500/8", border: "border-emerald-500/20" },
  { text: "갤럭시S25 당첨! 48시간 내 수령: http://prize-samsung.xyz", label: "PHISHING", cat: "이벤트 사기", color: "text-red-400", bg: "bg-red-500/8", border: "border-red-500/20" },
  { text: "[카카오뱅크] 5월 이자 납입 안내. 앱에서 확인해주세요.", label: "NORMAL", cat: "정상", color: "text-emerald-400", bg: "bg-emerald-500/8", border: "border-emerald-500/20" },
];

/* Donut chart SVG */
function DonutChart({ data }: { data: { label: string; pct: number; color: string }[] }) {
  const R = 60, cx = 80, cy = 80, stroke = 22;
  let offset = 0;
  const circumference = 2 * Math.PI * R;
  return (
    <svg viewBox="0 0 160 160" className="w-36 h-36">
      {data.map((d, i) => {
        const dash = (d.pct / 100) * circumference;
        const gap = circumference - dash;
        const rotate = (offset / 100) * 360 - 90;
        offset += d.pct;
        return (
          <circle key={i} cx={cx} cy={cy} r={R}
            fill="none" stroke={d.color} strokeWidth={stroke}
            strokeDasharray={`${dash} ${gap}`}
            strokeDashoffset={0}
            transform={`rotate(${rotate} ${cx} ${cy})`}
            strokeOpacity={0.8} />
        );
      })}
      <text x={cx} y={cy - 6} textAnchor="middle" fontSize={16} fill="white" fontWeight="bold">33,700</text>
      <text x={cx} y={cy + 10} textAnchor="middle" fontSize={9} fill="rgba(255,255,255,0.35)">총 샘플</text>
    </svg>
  );
}

export function DatasetStats() {
  return (
    <div className="px-4 sm:px-6 py-8 max-w-5xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Database size={14} className="text-blue-400" />
          <span className="text-xs text-blue-400 tracking-widest uppercase">학습 데이터</span>
        </div>
        <h1 className="text-white mb-1" style={{ fontWeight: 700, fontSize: "1.5rem" }}>데이터셋 통계</h1>
        <p className="text-sm text-white/40">분석 모델 학습에 사용된 데이터 구성, 출처, 전처리 파이프라인</p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "총 샘플", value: "33,700", sub: "피싱+정상" },
          { label: "학습 데이터", value: "26,960", sub: "80%" },
          { label: "검증 데이터", value: "3,370", sub: "10%" },
          { label: "테스트 데이터", value: "3,370", sub: "10%" },
        ].map((k) => (
          <div key={k.label} className="bg-[#111c30] border border-white/10 rounded-xl p-4">
            <p className="text-[11px] text-white/30">{k.label}</p>
            <p className="text-white mt-0.5" style={{ fontWeight: 700, fontSize: "1.3rem" }}>{k.value}</p>
            <p className="text-[11px] text-white/30">{k.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Class distribution */}
        <div className="bg-[#111c30] border border-white/10 rounded-xl p-5">
          <p className="text-sm text-white/70 mb-4" style={{ fontWeight: 500 }}>클래스 분포</p>
          <div className="flex items-center gap-6">
            <DonutChart data={CLASS_DIST.map((c) => ({ label: c.label, pct: c.pct, color: c.color }))} />
            <div className="space-y-3 flex-1">
              {CLASS_DIST.map((c) => (
                <div key={c.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-white/60">{c.label}</span>
                    <span style={{ color: c.color }}>{c.count.toLocaleString()}건</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/8 overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${c.pct}%` }} transition={{ duration: 0.8 }}
                      className="h-full rounded-full" style={{ backgroundColor: c.color, opacity: 0.75 }} />
                  </div>
                  <p className="text-[10px] text-white/25 mt-0.5">{c.pct}%</p>
                </div>
              ))}
              <div className="p-2 rounded-lg bg-emerald-500/8 border border-emerald-500/20">
                <p className="text-[10px] text-emerald-400 flex items-center gap-1"><CheckCircle2 size={9} /> 클래스 불균형 없음 (1:1 비율)</p>
              </div>
            </div>
          </div>
        </div>

        {/* Category distribution */}
        <div className="bg-[#111c30] border border-white/10 rounded-xl p-5">
          <p className="text-sm text-white/70 mb-4" style={{ fontWeight: 500 }}>피싱 유형별 분포</p>
          <div className="space-y-2.5">
            {CATEGORIES.map((c, i) => (
              <div key={c.name} className="flex items-center gap-3">
                <span className="text-[11px] text-white/30 w-3">{i + 1}</span>
                <span className="text-xs text-white/60 w-28 shrink-0">{c.name}</span>
                <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${c.pct}%` }} transition={{ delay: i * 0.07, duration: 0.6 }}
                    className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-500" />
                </div>
                <span className="text-[11px] text-white/40 w-8 text-right">{c.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Data sources */}
      <div className="bg-[#111c30] border border-white/10 rounded-xl p-5">
        <p className="text-sm text-white/70 mb-4" style={{ fontWeight: 500 }}>데이터 출처</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {SOURCES.map((s) => (
            <div key={s.name} className="p-3 rounded-xl bg-white/3 border border-white/5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-white/60">{s.name}</span>
                <span className="text-xs" style={{ color: s.color }}>{s.pct}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/8 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${s.pct}%`, backgroundColor: s.color, opacity: 0.7 }} />
              </div>
              <p className="text-[11px] text-white/30 mt-1">{s.count.toLocaleString()}건</p>
            </div>
          ))}
        </div>
      </div>

      {/* Preprocessing pipeline */}
      <div className="bg-[#111c30] border border-white/10 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <GitBranch size={13} className="text-white/40" />
          <p className="text-sm text-white/70" style={{ fontWeight: 500 }}>전처리 파이프라인</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {PIPELINE.map((p, i) => (
            <motion.div key={p.step} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
              className={`p-3 rounded-xl border ${p.color}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-white/70" style={{ fontWeight: 500 }}>{p.step}</span>
              </div>
              <p className="text-[11px] text-white/40 leading-relaxed">{p.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Sample data */}
      <div className="bg-[#111c30] border border-white/10 rounded-xl p-5">
        <p className="text-sm text-white/70 mb-4" style={{ fontWeight: 500 }}>샘플 데이터</p>
        <div className="space-y-2.5">
          {SAMPLES.map((s, i) => (
            <div key={i} className={`p-3 rounded-xl border ${s.bg} ${s.border} flex items-start gap-3`}>
              <span className={`text-[10px] px-2 py-0.5 rounded border shrink-0 mt-0.5 ${s.border} ${s.color} font-mono`}>{s.label}</span>
              <div>
                <p className="text-xs text-white/65 leading-relaxed">{s.text}</p>
                <p className="text-[10px] text-white/30 mt-0.5">{s.cat}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2 p-3 rounded-lg bg-blue-500/5 border border-blue-500/15">
          <Info size={11} className="text-blue-400 shrink-0" />
          <p className="text-[11px] text-white/40">모든 데이터는 개인정보 비식별화 처리 완료. 실제 전화번호·이름 포함 없음.</p>
        </div>
      </div>
    </div>
  );
}
