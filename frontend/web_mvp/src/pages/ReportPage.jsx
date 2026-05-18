import { Flag, Send } from "lucide-react";
import { panelClass, SectionTitle } from "../components/mvp/ui.jsx";
import handleReportSubmit from "../utils/handleReportSubmit.js";

const reportTypes = [
  "택배 사칭형",
  "가족 사칭형",
  "기관/금융 사칭형",
  "금융기관 사칭형",
  "정부기관 사칭형",
  "개인정보 탈취형",
  "정상 문자 가능성",
  "기타",
];

export function ReportPage({
  reportText,
  reportType,
  setReportText,
  setReportType,
  warm,
}) {
  const visibleReportTypes = reportTypes.includes(reportType)
    ? reportTypes
    : [reportType, ...reportTypes];

  // 폼 제출 핸들러 바인딩
  const onFormSubmit = (event) => {
    handleReportSubmit(event, reportText, reportType, setReportText);
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className={panelClass(warm, "p-8")}>
        <SectionTitle
          icon={Flag}
          subtitle="Report"
          title="스미싱 신고 안내"
          warm={warm}
        />

        <p className="mt-4 text-base font-medium leading-7 text-slate-500">
          새로 발견한 의심 문자를 정리해 신고할 수 있도록 돕는 화면입니다. 신고
          API가 연결되면 이 화면에서 서버로 전송합니다.
        </p>

        {/* 입력 폼 영역 */}
        <form onSubmit={onFormSubmit} className="mt-8 space-y-6">
          {/* 신고 유형 선택 */}
          <div className="flex flex-col gap-2">
            <label
              htmlFor="report-type"
              className="text-sm font-black text-slate-700"
            >
              신고 유형
            </label>
            <select
              id="report-type"
              className="w-full rounded-2xl border-2 border-slate-200 bg-white p-4 font-bold text-slate-800 transition focus:border-red-500 focus:outline-none"
              value={reportType}
              onChange={(event) => setReportType(event.target.value)}
            >
              {visibleReportTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {/* 의심 문자 내용 입력 */}
          <div className="flex flex-col gap-2">
            <label
              htmlFor="report-message"
              className="text-sm font-black text-slate-700"
            >
              의심 문자 내용
            </label>
            <textarea
              id="report-message"
              className="min-h-48 w-full rounded-2xl border-2 border-slate-200 bg-white p-4 leading-7 text-slate-800 placeholder:text-slate-400 transition focus:border-red-500 focus:outline-none resize-none"
              value={reportText}
              onChange={(event) => setReportText(event.target.value)}
              placeholder="받으신 문자 내용을 있는 그대로 복사해서 입력해주세요."
            />
          </div>

          {/* 전송 버튼 */}
          <button
            type="submit"
            disabled={!reportText.trim()}
            className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-red-600 font-black text-white shadow-lg shadow-red-600/10 transition duration-200 hover:bg-red-700 active:scale-[0.99] disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none disabled:pointer-events-none"
          >
            <Send className="h-5 w-5" />
            <span>신고 내용 전송하기</span>
          </button>
        </form>
      </div>
    </div>
  );
}
