import { Copy, FileText, Gauge, MessageSquareQuote, PhoneCall } from "lucide-react";
import { RISK_THEME } from "../config/riskTheme";
import { Button } from "./ui/Button";

export function ResultPanel({ copyState, guardianText, onCopy, result, selectedPrototype }) {
  const theme = RISK_THEME[result.riskLevel];
  const RiskIcon = theme.icon;
  const isSenior = selectedPrototype === "senior";
  const isIntegratedQuickCheck = selectedPrototype === "basic";
  const isDashboard = selectedPrototype === "dashboard" || isIntegratedQuickCheck;

  return (
    <section className="space-y-5">
      <RiskSummary result={result} theme={theme} RiskIcon={RiskIcon} isSenior={isSenior} />

      <div className="grid gap-5 xl:grid-cols-[0.82fr_1.18fr]">
        <ImpersonationCard result={result} isSenior={isSenior} />
        <EvidenceList result={result} isSenior={isSenior} />
      </div>

      <ActionGuide result={result} isSenior={isSenior} />

      <FamilyRequestCard copyState={copyState} guardianText={guardianText} onCopy={onCopy} />

      {isDashboard && <DashboardFactors result={result} />}

      <AiExplanation result={result} isSenior={isSenior} />
    </section>
  );
}

function RiskSummary({ RiskIcon, isSenior, result, theme }) {
  return (
    <div className={`rounded-lg border p-5 sm:p-6 ${theme.panel}`} role="status">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-black text-slate-600">위험 가능성</p>
          <div className="mt-2 flex items-center gap-3">
            <RiskIcon className="h-10 w-10 text-slate-950" aria-hidden="true" />
            <p className={`${isSenior ? "text-6xl" : "text-5xl"} font-black tracking-normal`}>
              {result.riskScore}
            </p>
            <span className="pt-4 text-lg font-black text-slate-700">점</span>
          </div>
        </div>
        <span className={`rounded-full px-4 py-2 text-sm font-black ring-1 ${theme.badge}`}>
          {theme.label}
        </span>
      </div>
      <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/80">
        <div className={`h-full rounded-full ${theme.bar}`} style={{ width: `${result.riskScore}%` }} />
      </div>
      <p className={`${isSenior ? "text-xl leading-9" : "text-base leading-7"} mt-5 font-black text-slate-800`}>
        {theme.headline}
      </p>
      <p className="mt-2 text-sm leading-6 text-slate-700">
        이 결과는 참고용입니다. 문자 안의 링크나 첨부파일은 열지 말고, 송금 요청과 개인정보 입력은 진행하지 마세요.
      </p>
    </div>
  );
}

function ImpersonationCard({ isSenior, result }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-slate-500">사칭 유형</p>
          <h2 className={`${isSenior ? "text-3xl" : "text-2xl"} mt-1 font-black`}>
            {result.impersonationType}
          </h2>
        </div>
        <FileText className="h-6 w-6 text-blue-700" aria-hidden="true" />
      </div>

      {result.highlightedTerms.length > 0 && (
        <div className="mt-5">
          <p className="mb-2 text-sm font-black text-slate-600">감지된 표현</p>
          <div className="flex flex-wrap gap-2">
            {result.highlightedTerms.map((term) => (
              <span
                className="rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-700"
                key={term}
              >
                {term}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function EvidenceList({ isSenior, result }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 sm:p-6">
      <h2 className={`${isSenior ? "text-2xl" : "text-xl"} font-black`}>의심 요인</h2>
      <ul className="mt-4 space-y-3">
        {result.suspiciousEvidence.map((evidence) => (
          <li
            className={`flex gap-3 leading-7 text-slate-700 ${isSenior ? "text-lg" : "text-sm"}`}
            key={evidence}
          >
            <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-blue-700" />
            <span>{evidence}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ActionGuide({ isSenior, result }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 sm:p-6">
      <h2 className={`${isSenior ? "text-2xl" : "text-xl"} font-black`}>결과 안내</h2>
      <ol className="mt-4 grid gap-3 md:grid-cols-2">
        {result.recommendedActions.map((action, index) => (
          <li
            className={`flex gap-3 rounded-lg bg-slate-50 p-3 leading-7 text-slate-700 ${
              isSenior ? "text-lg" : "text-sm"
            }`}
            key={action}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-700 text-sm font-black text-white">
              {index + 1}
            </span>
            <span>{action}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function FamilyRequestCard({ copyState, guardianText, onCopy }) {
  return (
    <section className="rounded-lg border border-violet-200 bg-violet-50 p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <PhoneCall className="mt-1 h-6 w-6 shrink-0 text-violet-800" aria-hidden="true" />
        <div>
          <h2 className="text-xl font-black text-violet-950">가족에게 확인 요청하기</h2>
          <p className="mt-3 text-sm leading-7 text-violet-950">{guardianText}</p>
          <Button className="mt-4 w-auto px-4" onClick={onCopy} variant="family">
            <Copy className="h-5 w-5" aria-hidden="true" />
            {copyState === "copied" ? "복사 완료" : "확인 문구 복사"}
          </Button>
          {copyState === "failed" && (
            <p className="mt-2 text-sm font-bold text-violet-900">복사 권한을 확인해 주세요.</p>
          )}
        </div>
      </div>
    </section>
  );
}

function DashboardFactors({ result }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 sm:p-6">
      <div className="mb-5 flex items-center gap-2">
        <Gauge className="h-5 w-5 text-slate-800" aria-hidden="true" />
        <h2 className="text-xl font-black">위험 요인별 점수</h2>
      </div>
      <div className="space-y-4">
        {result.factorScores.map((factor) => (
          <div key={factor.label}>
            <div className="mb-2 flex items-center justify-between text-sm font-black text-slate-700">
              <span>{factor.label}</span>
              <span>{factor.score}점</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-slate-800" style={{ width: `${factor.score}%` }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function AiExplanation({ isSenior, result }) {
  const explanation =
    result.explanation ||
    "입력한 문자와 판별 결과를 바탕으로 상세 설명을 준비하지 못했습니다. AI 판단 결과는 완벽하지 않을 수 있으니, 조금이라도 의심되면 공식 앱, 공식 홈페이지, 대표 고객센터 번호로 직접 확인해 주세요.";

  return (
    <section className="rounded-lg border border-blue-200 bg-blue-50 p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <MessageSquareQuote className="mt-1 h-6 w-6 shrink-0 text-blue-800" aria-hidden="true" />
        <div>
          <p className="text-sm font-black text-blue-700">디코더 생성 문구</p>
          <h2 className={`${isSenior ? "text-2xl" : "text-xl"} mt-1 font-black text-blue-950`}>
            AI 상세 설명
          </h2>
          <p className="mt-2 text-sm leading-6 text-blue-900">
            아래 내용은 입력한 문자와 판별 결과를 바탕으로 생성된 참고 설명입니다.
          </p>
          <p className={`${isSenior ? "text-lg leading-9" : "text-base leading-7"} mt-4 font-bold text-slate-800`}>
            {explanation}
          </p>
        </div>
      </div>
    </section>
  );
}
