import {useState, useEffect} from "react";
import {api, ApiException} from "@/lib/api";
import {
Clock,
ShieldAlert,
ShieldCheck,
AlertTriangle,
Trash2,
Search,
ChevronDown,
ChevronUp,

} from "lucide-react";
import {motion, AnimatePresence} from "motion/react";
import {EmptyState} from "./EmptyState";
import {LoadingSkeleton} from "./LoadingSkeleton";

interface HistoryItem {
  id: string;
  date: string;
  time: string;
  sender: string;
  preview: string;
  riskLevel: "HIGH" | "MEDIUM" | "LOW";
  score: number;
  reasons: string[];
  model: string;
}

const MOCK_HISTORY: HistoryItem[] = [
  {
    id: "h1",
    date: "2025.04.30",
    time: "14:32",
    sender: "국민건강보험공단",
    preview: "【국민건강보험】미납보험료가 있습니다. 즉시 납부하지 않으면...",
    riskLevel: "HIGH",
    score: 9,
    reasons: ["공공기관 사칭", "긴급성 표현 과다 사용", "비공식 도메인 URL 포함"],
    model: "분석 모델 미정",
  },
  {
    id: "h2",
    date: "2025.04.30",
    time: "13:18",
    sender: "카카오",
    preview: "카카오 인증번호는 [394821]입니다. 타인에게 절대 알려주지...",
    riskLevel: "LOW",
    score: 1,
    reasons: ["정상적인 OTP 패턴", "URL 미포함", "공식 발신 번호"],
    model: "분석 모델 미정",
  },
  {
    id: "h3",
    date: "2025.04.29",
    time: "19:45",
    sender: "010-5839-2847",
    preview: "[CJ대한통운] 고객님의 택배가 주소불명으로 반송될 예정입니다...",
    riskLevel: "HIGH",
    score: 8,
    reasons: ["택배사 사칭 (비공식 번호)", "반송/주소불명 공포 유발", "의심스러운 리다이렉트 URL"],
    model: "분석 모델 미정",
  },
  {
    id: "h4",
    date: "2025.04.29",
    time: "11:22",
    sender: "이벤트팀",
    preview: "[이벤트당첨] 축하합니다! 고객님이 갤럭시S24 특별 추첨에...",
    riskLevel: "MEDIUM",
    score: 6,
    reasons: ["응모 이력 없는 당첨 주장", "시간 제한 압박 (48시간)", "비공식 .xyz 도메인"],
    model: "분석 모델 미정",
  },
  {
    id: "h5",
    date: "2025.04.28",
    time: "09:05",
    sender: "KB국민은행",
    preview: "【KB국민은행】 고객님의 계좌에서 비정상 접근이 감지되었습니다...",
    riskLevel: "HIGH",
    score: 10,
    reasons: ["금융기관 사칭", "계좌 동결 위협", "24시간 시간 제한", "개인정보 입력 유도 URL"],
    model: "분석 모델 미정",
  },
  {
    id: "h6",
    date: "2025.04.27",
    time: "16:40",
    sender: "SKT",
    preview: "[SKT] 고객님의 5월 요금이 청구되었습니다. 확인: 114 또는...",
    riskLevel: "LOW",
    score: 2,
    reasons: ["정상적인 통신사 고지", "공식 채널(114)만 안내", "URL 미포함"],
    model: "분석 모델 미정",
  },
];

const riskConfig = {
  HIGH: {
    icon: ShieldAlert,
    cls: "text-red-400",
    bg: "bg-red-500/15",
    border: "border-red-500/30",
    badge: "bg-red-500/20 text-red-400 border border-red-500/30",
  },
  MEDIUM: {
    icon: AlertTriangle,
    cls: "text-orange-400",
    bg: "bg-orange-500/15",
    border: "border-orange-500/30",
    badge: "bg-orange-500/20 text-orange-400 border border-orange-500/30",
  },
  LOW: {
    icon: ShieldCheck,
    cls: "text-emerald-400",
    bg: "bg-emerald-500/15",
    border: "border-emerald-500/30",
    badge: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
  },
};

function HistoryCard({ item, onDelete }: { item: HistoryItem; onDelete: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = riskConfig[item.riskLevel];
  const Icon = cfg.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="bg-[#111c30] border border-white/10 rounded-xl overflow-hidden"
    >
      <div
        className="p-4 cursor-pointer hover:bg-white/3 transition-all"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start gap-3">
          <div className={`shrink-0 w-9 h-9 rounded-lg ${cfg.bg} flex items-center justify-center`}>
            <Icon size={16} className={cfg.cls} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-2">
                <span className={`px-1.5 py-0.5 rounded text-[10px] ${cfg.badge}`}>
                  {item.riskLevel}
                </span>
                <span className="text-xs text-white/50">{item.sender}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-white/25">{item.date} {item.time}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
                  className="p-1 rounded hover:bg-red-500/10 text-white/20 hover:text-red-400 transition-all"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
            <p className="text-xs text-white/50 truncate">{item.preview}</p>
            <div className="flex items-center gap-2 mt-1.5">
              <div className="h-1 w-20 bg-white/5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    item.riskLevel === "HIGH" ? "bg-red-500" : item.riskLevel === "MEDIUM" ? "bg-orange-400" : "bg-emerald-400"
                  }`}
                  style={{ width: `${item.score * 10}%` }}
                />
              </div>
              <span className={`text-[11px] ${cfg.cls}`}>{item.score}/10</span>
            </div>
          </div>
          <div className="shrink-0 pt-1">
            {expanded ? <ChevronUp size={13} className="text-white/30" /> : <ChevronDown size={13} className="text-white/30" />}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-3 border-t border-white/5 space-y-3">
              <div>
                <p className="text-[11px] text-white/30 mb-2">판단 이유</p>
                <ol className="space-y-1.5">
                  {item.reasons.map((r, i) => (
                    <li key={i} className="flex items-center gap-2 text-xs text-white/60">
                      <span className={`shrink-0 w-4 h-4 rounded-full ${cfg.bg} ${cfg.cls} flex items-center justify-center text-[10px]`} style={{ fontWeight: 600 }}>
                        {i + 1}
                      </span>
                      {r}
                    </li>
                  ))}
                </ol>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-white/5">
                <span className="text-[11px] text-white/25">모델: {item.model}</span>
                <span className="text-[11px] text-white/25">분석 시각: {item.date} {item.time}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function History() {
  const [items, setItems] = useState(MOCK_HISTORY);
  const [loading, setLoading] = useState(false);

  // 백엔드 연동: 페이지 마운트 시 검사 이력 로드
  // VITE_USE_MOCK=true (기본값) 일 때는 fetch 스킵하고 MOCK_HISTORY 사용 — 백엔드 안 켜도 콘솔 에러 X
  useEffect(() => {
    const useMock = import.meta.env.VITE_USE_MOCK !== "false";
    if (useMock) {
      setItems(MOCK_HISTORY);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await api.getHistory();
        if (!cancelled && data.items.length > 0) {
          // API의 HistoryItem은 types/api.ts 정의, 컴포넌트 내부에서 자체 HistoryItem 사용
          // — 필드명이 일부 다르므로 (date/time/preview 등) 양방향 어댑터는 별도 라운드
          // 일단 cast: API items가 0건이면 mock fallback, 1건 이상이면 그대로 사용
          setItems(data.items as unknown as HistoryItem[]);
        }
      } catch (e) {
        if (e instanceof ApiException) {
          console.warn("[History] API 실패, mock fallback:", e.message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"전체" | "HIGH" | "MEDIUM" | "LOW">("전체");

  const filtered = items.filter((item) => {
    const matchSearch =
      search === "" ||
      item.sender.includes(search) ||
      item.preview.includes(search);
    const matchFilter = filter === "전체" || item.riskLevel === filter;
    return matchSearch && matchFilter;
  });

  const handleDelete = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleClearAll = () => setItems([]);

  const counts = {
    total: items.length,
    high: items.filter((i) => i.riskLevel === "HIGH").length,
    medium: items.filter((i) => i.riskLevel === "MEDIUM").length,
    low: items.filter((i) => i.riskLevel === "LOW").length,
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] px-4 sm:px-6 py-8 max-w-4xl mx-auto bg-[#0b1120]">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Clock size={14} className="text-cyan-400" />
          <span className="text-xs text-cyan-400 tracking-widest uppercase">분석 기록</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-white mb-1" style={{ fontWeight: 700, fontSize: "1.5rem" }}>분석 이력</h1>
            <p className="text-sm text-white/40">이전에 분석한 문자들의 기록입니다.</p>
          </div>
          {items.length > 0 && (
            <button
              onClick={handleClearAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 text-xs text-white/40 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/5 transition-all"
            >
              <Trash2 size={12} />
              전체 삭제
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: "전체", value: counts.total, color: "text-white/60" },
          { label: "HIGH", value: counts.high, color: "text-red-400" },
          { label: "MEDIUM", value: counts.medium, color: "text-orange-400" },
          { label: "LOW", value: counts.low, color: "text-emerald-400" },
        ].map((s) => (
          <div key={s.label} className="bg-[#111c30] border border-white/10 rounded-xl p-3 text-center">
            <p className={s.color} style={{ fontWeight: 700, fontSize: "1.25rem" }}>{s.value}</p>
            <p className="text-[11px] text-white/30">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="flex items-center gap-2 flex-1 px-3 py-2.5 bg-[#111c30] border border-white/10 rounded-xl">
          <Search size={13} className="text-white/30" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="발신자, 문자 내용 검색..."
            className="flex-1 bg-transparent text-sm text-white/70 placeholder:text-white/25 outline-none"
          />
        </div>
        <div className="flex gap-2">
          {(["전체", "HIGH", "MEDIUM", "LOW"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-2 rounded-xl text-xs transition-all border ${
                filter === f
                  ? f === "HIGH"
                    ? "bg-red-500/20 border-red-500/30 text-red-400"
                    : f === "MEDIUM"
                    ? "bg-orange-500/20 border-orange-500/30 text-orange-400"
                    : f === "LOW"
                    ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400"
                    : "bg-cyan-500/20 border-cyan-500/30 text-cyan-400"
                  : "bg-white/5 border-white/10 text-white/40 hover:text-white/60"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="space-y-3">
        <AnimatePresence>
          {loading && items.length === 0 ? (
            <LoadingSkeleton variant="list" count={5} />
          ) : filtered.length === 0 ? (
            items.length === 0 ? (
              <EmptyState
                icon="history"
                title="아직 검사 이력이 없어요"
                description="문자·URL·이미지를 검사해보시면 여기에 기록이 쌓여요."
                action={{ label: "검사 시작하기", to: "/analyze" }}
              />
            ) : (
              <EmptyState
                icon="search"
                title="검색 결과가 없어요"
                description="다른 검색어로 시도하거나 필터를 변경해보세요."
                action={{ label: "필터 초기화", onClick: () => { setSearch(""); setFilter("전체"); } }}
              />
            )
          ) : (
            filtered.map((item) => (
              <HistoryCard key={item.id} item={item} onDelete={handleDelete} />
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
