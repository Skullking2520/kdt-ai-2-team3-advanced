import { motion } from "motion/react";
import { GitCommit, Tag, Cpu, Shield, BarChart2, Bug, Star, ArrowUp } from "lucide-react";

const VERSIONS = [
  {
    version: "v1.0.3",
    date: "2025.04.30",
    type: "patch",
    highlight: "현재 버전",
    changes: [
      { type: "fix", icon: Bug, text: "ErrorAnalysis.tsx 파싱 오류 수정 (setShow 문법)" },
      { type: "fix", icon: Bug, text: "Dashboard 차트 recharts 중복 key 경고 제거 → 순수 SVG 교체" },
      { type: "feat", icon: Star, text: "어텐션 시각화 (AttentionViz) 페이지 추가" },
      { type: "feat", icon: Star, text: "모델 아키텍처 시각화 (ModelArchitecture) 추가" },
      { type: "feat", icon: Star, text: "인터랙티브 API 탐색기 (APIExplorer) 추가" },
      { type: "feat", icon: Star, text: "설정 페이지 (Settings) localStorage 영구 저장 추가" },
      { type: "feat", icon: Star, text: "트렌드 리포트 (TrendReport) 순수 SVG 차트 구현" },
    ],
  },
  {
    version: "v1.0.2",
    date: "2025.04.22",
    type: "minor",
    highlight: "",
    changes: [
      { type: "feat", icon: Star, text: "피싱 갤러리 (PhishingGallery) 페이지 추가" },
      { type: "feat", icon: Star, text: "리포트 내보내기 (ReportExport) JSON/PDF/CSV 지원" },
      { type: "feat", icon: Star, text: "실시간 탐지 피드 (LiveFeed) 추가" },
      { type: "feat", icon: Star, text: "오탐/미탐 분석 (ErrorAnalysis) 관리자 전용 추가" },
      { type: "feat", icon: Star, text: "취약 계층 가이드 (VulnerableGuide) 추가" },
      { type: "feat", icon: Star, text: "신규 라우트 5개 (/gallery, /export, /live-feed, /error-analysis, /guide)" },
    ],
  },
  {
    version: "v1.0.1",
    date: "2025.04.15",
    type: "minor",
    highlight: "",
    changes: [
      { type: "feat", icon: Star, text: "관리자 인증 시스템 (AdminContext) 구현 — VITE_ADMIN_PASSWORD 환경변수 사용" },
      { type: "feat", icon: Star, text: "AdminPanel 모델 성능 비교 페이지 추가" },
      { type: "feat", icon: Star, text: "SMS 시뮬레이터 (SMSSimulator) 인터랙티브 받은문자함 추가" },
      { type: "feat", icon: Star, text: "제로데이 탐지 원리 (ZeroDayExplainer) 추가" },
      { type: "perf", icon: ArrowUp, text: "AdminPanel 차트 순수 SVG/CSS 커스텀 구현으로 전환" },
      { type: "fix", icon: Bug, text: "라우팅 충돌 수정 (react-router-dom → react-router)" },
    ],
  },
  {
    version: "v1.0.0",
    date: "2025.04.08",
    type: "major",
    highlight: "최초 릴리즈",
    changes: [
      { type: "feat", icon: Cpu, text: "AI 모델 기반 SMS 피싱 탐지 엔진 연동 (모델 확정 후 업데이트 예정)" },
      { type: "feat", icon: Shield, text: "위험도 점수 1~10점 + HIGH/MEDIUM/LOW 등급 산출" },
      { type: "feat", icon: Star, text: "문자 분석 (Analyzer) 메인 페이지 구현" },
      { type: "feat", icon: BarChart2, text: "대시보드 (Dashboard) 통계 시각화" },
      { type: "feat", icon: Star, text: "패턴 데이터베이스 (PatternDB) 247개 패턴 등록" },
      { type: "feat", icon: Star, text: "분석 이력 (History) 페이지 구현" },
      { type: "feat", icon: Star, text: "신고 & 제보 (ReportPage) 기능 구현" },
      { type: "feat", icon: Star, text: "Layout.tsx 사이드바 네비게이션 + 트렌드 알림 배너" },
    ],
  },
  {
    version: "v0.9.0-beta",
    date: "2025.03.28",
    type: "beta",
    highlight: "",
    changes: [
      { type: "feat", icon: Star, text: "UI/UX 프로토타입 초기 설계" },
      { type: "feat", icon: Star, text: "FastAPI 백엔드 API 스펙 정의" },
      { type: "feat", icon: Cpu, text: "스미싱 탐지 모델 학습 데이터 수집 (모델 확정 후 업데이트 예정)" },
      { type: "feat", icon: Star, text: "프로젝트 초기화 (React + Tailwind CSS v4)" },
    ],
  },
];

const TYPE_STYLE = {
  major: { bg: "bg-cyan-500/15", border: "border-cyan-500/30", text: "text-cyan-400", label: "MAJOR" },
  minor: { bg: "bg-violet-500/15", border: "border-violet-500/30", text: "text-violet-400", label: "MINOR" },
  patch: { bg: "bg-emerald-500/15", border: "border-emerald-500/30", text: "text-emerald-400", label: "PATCH" },
  beta: { bg: "bg-amber-500/15", border: "border-amber-500/30", text: "text-amber-400", label: "BETA" },
};

const CHANGE_TYPE_STYLE = {
  feat: { color: "text-cyan-400", label: "feat" },
  fix: { color: "text-red-400", label: "fix" },
  perf: { color: "text-emerald-400", label: "perf" },
};

export function Changelog() {
  return (
    <div className="px-4 sm:px-6 py-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <GitCommit size={14} className="text-emerald-400" />
          <span className="text-xs text-emerald-400 tracking-widest uppercase">릴리즈 노트</span>
        </div>
        <h1 className="text-white mb-1" style={{ fontWeight: 700, fontSize: "1.5rem" }}>변경 이력</h1>
        <p className="text-sm text-white/40">NewBiz Shield 모델 업데이트 및 기능 추가 이력</p>
      </div>

      {/* Current version callout */}
      <div className="flex items-center gap-3 mb-8 p-3 bg-cyan-500/8 border border-cyan-500/20 rounded-xl">
        <Tag size={13} className="text-cyan-400 shrink-0" />
        <p className="text-xs text-cyan-400">현재 버전: <strong>v1.0.3</strong> · AI 모델 연동 준비 중</p>
      </div>

      {/* Timeline */}
      <div className="relative">
        <div className="absolute left-[88px] top-3 bottom-3 w-px bg-white/8" />
        <div className="space-y-8">
          {VERSIONS.map((v, vi) => {
            const ts = TYPE_STYLE[v.type as keyof typeof TYPE_STYLE];
            return (
              <motion.div key={v.version} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: vi * 0.1 }}
                className="flex gap-5">
                {/* Left: version + date */}
                <div className="w-20 shrink-0 pt-1 text-right">
                  <p className="text-[10px] text-white/25">{v.date}</p>
                </div>
                {/* Dot */}
                <div className="relative z-10 flex flex-col items-center shrink-0 pt-1.5">
                  <div className={`w-3 h-3 rounded-full border-2 ${ts.border} ${vi === 0 ? "bg-cyan-400" : "bg-[#0b1120]"}`} />
                </div>
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-white/80" style={{ fontWeight: 700 }}>{v.version}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded border ${ts.bg} ${ts.border} ${ts.text} font-mono`}>{ts.label}</span>
                    {v.highlight && <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-white/40 border border-white/10">{v.highlight}</span>}
                  </div>
                  <div className="bg-[#111c30] border border-white/8 rounded-xl overflow-hidden">
                    <div className="divide-y divide-white/5">
                      {v.changes.map((c, ci) => {
                        const cts = CHANGE_TYPE_STYLE[c.type as keyof typeof CHANGE_TYPE_STYLE] ?? CHANGE_TYPE_STYLE.feat;
                        return (
                          <div key={ci} className="flex items-start gap-3 px-4 py-2.5 hover:bg-white/2 transition-all">
                            <span className={`text-[10px] font-mono ${cts.color} shrink-0 mt-0.5 w-8`}>{cts.label}</span>
                            <c.icon size={11} className="text-white/20 shrink-0 mt-0.5" />
                            <p className="text-xs text-white/55 leading-relaxed">{c.text}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
