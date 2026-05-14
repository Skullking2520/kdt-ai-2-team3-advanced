import { Flag, Send } from "lucide-react";
import { panelClass, SectionTitle } from "../components/mvp/ui.jsx";

const reportTypes = ["택배 사칭형", "가족 사칭형", "금융기관 사칭형", "정부기관 사칭형", "개인정보 탈취형", "기타"];

export function ReportPage({ reportText, reportType, setReportText, setReportType, warm }) {
  return (
    <div className="mx-auto max-w-3xl">
      <div className={panelClass(warm, "p-8")}>
        <SectionTitle icon={Flag} subtitle="Report" title="스미싱 신고 안내" warm={warm} />
        <p className="mt-4 text-lg font-bold leading-8 text-slate-600">
          새로 발견한 의심 문자를 정리해 신고할 수 있도록 돕는 화면입니다. 신고 API가 연결되면 이 화면에서 서버로 전송합니다.
        </p>
        <select
          className="mt-6 w-full rounded-2xl border-2 border-slate-200 bg-white p-4 font-bold"
          value={reportType}
          onChange={(event) => setReportType(event.target.value)}
        >
          {reportTypes.map((type) => (
            <option key={type}>{type}</option>
          ))}
        </select>
        <textarea
          className="mt-4 min-h-48 w-full rounded-2xl border-2 border-slate-200 bg-white p-4 leading-7"
          value={reportText}
          onChange={(event) => setReportText(event.target.value)}
          placeholder="받으신 문자 내용을 입력해주세요."
        />
        <button
          className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-red-600 font-black text-white disabled:bg-slate-300"
          disabled={!reportText.trim()}
          type="button"
        >
          <Send className="h-5 w-5" />
          신고 API 연결 후 전송
        </button>
      </div>
    </div>
  );
}
