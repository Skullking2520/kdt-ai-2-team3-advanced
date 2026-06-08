import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Code2, Play, ChevronDown, ChevronRight, Copy, Check, Terminal, Globe } from "lucide-react";

type Method = "POST" | "GET" | "DELETE";

interface Endpoint {
  id: string;
  method: Method;
  path: string;
  summary: string;
  description: string;
  requestBody?: object;
  response: object;
  tags: string[];
}

const ENDPOINTS: Endpoint[] = [
  {
    id: "analyze",
    method: "POST",
    path: "/api/v1/analyze",
    summary: "SMS 피싱 분석",
    description: "문자 내용을 분석하여 피싱 여부, 위험도 점수(1~10), 등급(HIGH/MEDIUM/LOW), 판단 이유를 반환합니다.",
    requestBody: { sender: "010-1234-5678", message: "【국민건강보험】미납보험료 즉시 납부 요청. http://example.com" },
    response: {
      id: "rpg-20250430-001",
      risk_level: "HIGH",
      score: 9,
      is_phishing: true,
      // confidence: 추후 모델 연동 시 추가
      reasons: ["공공기관 사칭 패턴 감지", "의심 URL 포함", "긴급성 표현 다중 사용"],
      keywords: ["즉시", "납부", "http://example.com"],
      model_version: "미정 (모델 연동 후 업데이트)",
      processing_ms: 142,
    },
    tags: ["분석"],
  },
  {
    id: "batch",
    method: "POST",
    path: "/api/v1/analyze/batch",
    summary: "SMS 일괄 분석",
    description: "최대 50건의 문자를 한 번에 분석합니다. 대량 데이터 처리에 적합합니다.",
    requestBody: {
      messages: [
        { id: "msg-1", sender: "010-1234-5678", message: "즉시 납부 바랍니다." },
        { id: "msg-2", sender: "SKT", message: "5월 요금 청구 안내입니다." },
      ],
    },
    response: {
      total: 2,
      processed: 2,
      results: [
        { id: "msg-1", risk_level: "HIGH", score: 8, is_phishing: true },
        { id: "msg-2", risk_level: "LOW", score: 1, is_phishing: false },
      ],
      processing_ms: 287,
    },
    tags: ["분석"],
  },
  {
    id: "patterns",
    method: "GET",
    path: "/api/v1/patterns",
    summary: "피싱 패턴 목록 조회",
    description: "현재 등록된 피싱 패턴 데이터베이스를 반환합니다. category, risk_level 파라미터로 필터링 가능합니다.",
    response: {
      total: 247,
      page: 1,
      per_page: 20,
      patterns: [
        { id: "pat-001", category: "공공기관 사칭", risk_level: "HIGH", keywords: ["즉시", "정지", "납부"], domain_patterns: ["*.kr-notice.com"] },
        { id: "pat-002", category: "금융 피싱", risk_level: "HIGH", keywords: ["동결", "비정상"], domain_patterns: ["*-secure.*"] },
      ],
    },
    tags: ["패턴"],
  },
  {
    id: "report",
    method: "POST",
    path: "/api/v1/report",
    summary: "피싱 문자 신고",
    description: "새로운 피싱 문자를 신고합니다. 검토 후 패턴 데이터베이스에 반영됩니다.",
    requestBody: {
      sender: "010-8821-3947",
      message: "신규 피싱 문자 내용...",
      reporter_note: "직접 수신한 문자로 의심되어 신고합니다.",
    },
    response: { report_id: "rep-20250430-892", status: "submitted", message: "신고가 접수되었습니다. 검토 후 반영됩니다." },
    tags: ["신고"],
  },
  {
    id: "stats",
    method: "GET",
    path: "/api/v1/stats",
    summary: "탐지 통계 조회",
    description: "일별/주별/월별 탐지 통계를 반환합니다.",
    response: {
      period: "2025-04-30",
      total_analyzed: 1247,
      high_count: 438,
      medium_count: 289,
      low_count: 520,
      top_categories: ["공공기관 사칭", "금융 피싱", "택배 사기"],
    },
    tags: ["통계"],
  },
];

const METHOD_STYLE: Record<Method, string> = {
  POST: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  GET: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  DELETE: "bg-red-500/20 text-red-400 border-red-500/30",
};

const ALL_TAGS = ["전체", "분석", "패턴", "신고", "통계"];

function CodeSnippet({ endpoint }: { endpoint: Endpoint }) {
  const [lang, setLang] = useState<"curl" | "python" | "js">("curl");
  const [copied, setCopied] = useState(false);

  const BASE = "https://api.newbiz-shield.kr";
  const body = endpoint.requestBody ? JSON.stringify(endpoint.requestBody, null, 2) : null;

  const snippets = {
    curl: endpoint.method === "GET"
      ? `curl -X GET "${BASE}${endpoint.path}" \\\n  -H "Authorization: Bearer YOUR_API_KEY" \\\n  -H "Content-Type: application/json"`
      : `curl -X ${endpoint.method} "${BASE}${endpoint.path}" \\\n  -H "Authorization: Bearer YOUR_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '${JSON.stringify(endpoint.requestBody)}'`,
    python: endpoint.method === "GET"
      ? `import requests\n\nheaders = {"Authorization": "Bearer YOUR_API_KEY"}\nresponse = requests.get(\n    "${BASE}${endpoint.path}",\n    headers=headers\n)\nprint(response.json())`
      : `import requests\n\nheaders = {"Authorization": "Bearer YOUR_API_KEY"}\npayload = ${JSON.stringify(endpoint.requestBody, null, 2)}\n\nresponse = requests.post(\n    "${BASE}${endpoint.path}",\n    json=payload,\n    headers=headers\n)\nprint(response.json())`,
    js: endpoint.method === "GET"
      ? `const response = await fetch("${BASE}${endpoint.path}", {\n  headers: {\n    "Authorization": "Bearer YOUR_API_KEY",\n  },\n});\nconst data = await response.json();\nconsole.log(data);`
      : `const response = await fetch("${BASE}${endpoint.path}", {\n  method: "${endpoint.method}",\n  headers: {\n    "Authorization": "Bearer YOUR_API_KEY",\n    "Content-Type": "application/json",\n  },\n  body: JSON.stringify(${JSON.stringify(endpoint.requestBody, null, 2)}),\n});\nconst data = await response.json();\nconsole.log(data);`,
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(snippets[lang]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl overflow-hidden border border-white/10">
      <div className="flex items-center gap-1 px-3 py-2 bg-[#0b1120] border-b border-white/8">
        {(["curl", "python", "js"] as const).map((l) => (
          <button key={l} onClick={() => setLang(l)}
            className={`px-2.5 py-1 rounded text-[11px] transition-all ${lang === l ? "bg-white/10 text-white/80" : "text-white/35 hover:text-white/55"}`}>
            {l === "js" ? "JavaScript" : l === "python" ? "Python" : "cURL"}
          </button>
        ))}
        <button onClick={handleCopy} className="ml-auto flex items-center gap-1 text-[11px] text-white/30 hover:text-white/60 transition-all">
          {copied ? <><Check size={10} className="text-emerald-400" /> 복사됨</> : <><Copy size={10} /> 복사</>}
        </button>
      </div>
      <pre className="px-4 py-3 text-[11px] text-emerald-300/80 font-mono overflow-x-auto leading-relaxed bg-[#0a1020]">
        {snippets[lang]}
      </pre>
    </div>
  );
}

function TryItPanel({ endpoint }: { endpoint: Endpoint }) {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<object | null>(null);
  const [body, setBody] = useState(endpoint.requestBody ? JSON.stringify(endpoint.requestBody, null, 2) : "");

  const handleRun = () => {
    setRunning(true);
    setResult(null);
    setTimeout(() => { setResult(endpoint.response); setRunning(false); }, 900);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#111c30] border border-white/8">
        <Globe size={11} className="text-white/25" />
        <span className="text-[11px] text-white/25">Base URL</span>
        <span className="text-[11px] text-cyan-400 font-mono ml-1">https://api.newbiz-shield.kr</span>
      </div>
      {endpoint.requestBody && (
        <div>
          <p className="text-[11px] text-white/30 mb-1.5">Request Body (JSON)</p>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5}
            className="w-full bg-[#0b1120] border border-white/10 rounded-xl px-3 py-2.5 text-[11px] text-emerald-300/70 font-mono outline-none resize-none focus:border-cyan-500/30 transition-all" />
        </div>
      )}
      <button onClick={handleRun} disabled={running}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 text-xs hover:bg-cyan-500/25 transition-all disabled:opacity-50">
        {running ? <div className="w-3 h-3 border border-cyan-400/40 border-t-cyan-400 rounded-full animate-spin" /> : <Play size={11} />}
        {running ? "실행 중..." : "실행 (Try it)"}
      </button>
      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">200 OK</span>
              <span className="text-[10px] text-white/25">application/json</span>
            </div>
            <pre className="bg-[#0a1020] border border-white/8 rounded-xl px-4 py-3 text-[11px] text-white/60 font-mono overflow-x-auto leading-relaxed">
              {JSON.stringify(result, null, 2)}
            </pre>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function APIExplorer() {
  const [activeTag, setActiveTag] = useState("전체");
  const [openId, setOpenId] = useState<string | null>("analyze");
  const [activeTab, setActiveTab] = useState<Record<string, "snippet" | "try">>({}); 

  const filtered = ENDPOINTS.filter((e) => activeTag === "전체" || e.tags.includes(activeTag));

  return (
    <div className="px-4 sm:px-6 py-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Code2 size={14} className="text-emerald-400" />
          <span className="text-xs text-emerald-400 tracking-widest uppercase">개발자 도구</span>
        </div>
        <h1 className="text-white mb-1" style={{ fontWeight: 700, fontSize: "1.5rem" }}>인터랙티브 API 탐색기</h1>
        <p className="text-sm text-white/40">NewBiz Shield REST API 명세 및 직접 테스트</p>
      </div>

      {/* API info bar */}
      <div className="flex flex-wrap items-center gap-3 mb-6 p-3 bg-[#111c30] border border-white/10 rounded-xl">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-emerald-400">서버 정상</span>
        </div>
        <span className="text-white/20">|</span>
        <span className="text-xs text-white/40 font-mono">v1.0.3</span>
        <span className="text-white/20">|</span>
        <span className="text-xs text-white/40">Base URL: <span className="text-cyan-400 font-mono">https://api.newbiz-shield.kr</span></span>
        <div className="ml-auto flex items-center gap-1.5">
          <Terminal size={11} className="text-white/30" />
          <span className="text-[11px] text-white/30">인증: Bearer Token</span>
        </div>
      </div>

      {/* Tag filter */}
      <div className="flex gap-1.5 mb-5 flex-wrap">
        {ALL_TAGS.map((tag) => (
          <button key={tag} onClick={() => setActiveTag(tag)}
            className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${
              activeTag === tag ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400" : "border-white/10 text-white/35 hover:text-white/55"
            }`}>
            {tag}
          </button>
        ))}
      </div>

      {/* Endpoints */}
      <div className="space-y-3">
        {filtered.map((ep) => {
          const isOpen = openId === ep.id;
          const tab = activeTab[ep.id] ?? "snippet";
          return (
            <div key={ep.id} className="bg-[#111c30] border border-white/10 rounded-xl overflow-hidden">
              <button
                onClick={() => setOpenId(isOpen ? null : ep.id)}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-white/3 transition-all"
              >
                <span className={`text-[11px] px-2 py-0.5 rounded border font-mono shrink-0 ${METHOD_STYLE[ep.method]}`}>{ep.method}</span>
                <span className="text-sm text-white/80 font-mono">{ep.path}</span>
                <span className="text-xs text-white/35 hidden sm:block">{ep.summary}</span>
                <ChevronDown size={14} className={`ml-auto text-white/25 transition-transform shrink-0 ${isOpen ? "rotate-180" : ""}`} />
              </button>

              <AnimatePresence>
                {isOpen && (
                  <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                    <div className="px-4 pb-5 border-t border-white/8 pt-4 space-y-4">
                      <p className="text-xs text-white/50 leading-relaxed">{ep.description}</p>

                      {/* Tags */}
                      <div className="flex gap-1.5">
                        {ep.tags.map((t) => (
                          <span key={t} className="text-[10px] px-2 py-0.5 rounded bg-white/5 border border-white/10 text-white/40">{t}</span>
                        ))}
                      </div>

                      {/* Tab toggle */}
                      <div className="flex gap-1 bg-[#0b1120] rounded-lg p-1 w-fit">
                        {(["snippet", "try"] as const).map((t) => (
                          <button key={t}
                            onClick={() => setActiveTab((prev) => ({ ...prev, [ep.id]: t }))}
                            className={`px-3 py-1.5 rounded text-[11px] transition-all ${
                              tab === t ? "bg-white/10 text-white/80" : "text-white/35 hover:text-white/55"
                            }`}>
                            {t === "snippet" ? "코드 스니펫" : "직접 테스트"}
                          </button>
                        ))}
                      </div>

                      {tab === "snippet" ? (
                        <CodeSnippet endpoint={ep} />
                      ) : (
                        <TryItPanel endpoint={ep} />
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
