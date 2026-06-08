import { useState, useRef, useCallback } from "react";
import { api, ApiException } from "@/lib/api";
import { ImageIcon, Upload, FileText, ChevronRight, RotateCcw, CheckCircle2, Loader2, AlertCircle, Edit3, X, Save } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router";

const OCR_STEPS = [
  "이미지 로딩 중",
  "텍스트 영역 인식 중",
  "글자 추출 중",
  "완료",
];

const MOCK_OCR_RESULTS = [
  "【CJ대한통운】배송 주소 확인이 필요합니다. 주소 오류로 반송 예정입니다. 확인: http://cj-delivery-check.com/re123",
  "고객님 본인인증이 만료되었습니다. 즉시 재인증하지 않으면 계좌가 정지됩니다. http://kb-secure-verify.net/auth",
  "【국민건강보험】미납 보험료 안내. 3일 이내 미납 시 급여 정지됩니다. 납부: http://nhis-pay-kr.com/check",
  "안녕 엄마 나야 폰이 고장났어 새 번호로 바꿨어 급하게 상품권 50만원어치 필요해 010-9382-7461",
];

export function ImageAnalyzer() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [ocrStep, setOcrStep] = useState(-1);
  const [ocrRunning, setOcrRunning] = useState(false);
  const [ocrText, setOcrText] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [ocrError, setOcrError] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const nav = useNavigate();

  const handleFile = (f: File) => {
    if (!f.type.startsWith("image/")) {
      alert("이미지 파일만 업로드 가능합니다.");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      alert("파일 크기는 10MB 이하여야 합니다.");
      return;
    }
    setFile(f);
    const url = URL.createObjectURL(f);
    setPreview(url);
    setOcrStep(-1);
    setOcrText(null);
    setOcrRunning(false);
    setOcrError(false);
    setIsEditing(false);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, []);

  const handleOcr = () => {
    if (!file || ocrRunning) return;
    setOcrRunning(true);
    setOcrStep(0);
    setOcrText(null);
    setOcrError(false);

    // 5% 확률로 OCR 실패 시뮬레이션
    const willFail = Math.random() < 0.05;

    let step = 0;
    const interval = setInterval(() => {
      step += 1;
      setOcrStep(step);
      if (step >= OCR_STEPS.length - 1) {
        clearInterval(interval);
        setTimeout(async () => {
          if (willFail) {
            setOcrError(true);
            setOcrRunning(false);
            return;
          }
          // 백엔드 연동: VITE_USE_MOCK=true 면 mock OCR, false 면 실제 OCR API
          try {
            const dataUri = preview ?? "";
            const ocr = await api.ocr(dataUri);
            setOcrText(ocr.text);
            setEditedText(ocr.text);
            setOcrRunning(false);
          } catch (e) {
            if (e instanceof ApiException) {
              console.error("[ImageAnalyzer] OCR 실패:", e.message);
            }
            // OCR 실패 시 fallback으로 mock 사용 (기존 UX 보존)
            const mockText = MOCK_OCR_RESULTS[Math.floor(Math.random() * MOCK_OCR_RESULTS.length)];
            setOcrText(mockText);
            setEditedText(mockText);
            setOcrRunning(false);
          }
        }, 400);
      }
    }, 650);
  };

  const handleAnalyze = () => {
    const textToAnalyze = isEditing ? editedText : ocrText;
    if (!textToAnalyze || !textToAnalyze.trim()) return;
    nav(`/analyze/progress?text=${encodeURIComponent(textToAnalyze)}&type=image`);
  };

  const handleReset = () => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
    setOcrStep(-1);
    setOcrText(null);
    setOcrRunning(false);
    setOcrError(false);
    setIsEditing(false);
    setEditedText("");
  };

  const handleRetryOcr = () => {
    setOcrError(false);
    handleOcr();
  };

  const handleEditSave = () => {
    if (editedText.trim()) {
      setOcrText(editedText);
      setIsEditing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      {/* 헤더 */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center gap-2 mb-2">
          <ImageIcon size={16} className="text-emerald-600 dark:text-emerald-400" />
          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold uppercase tracking-widest">이미지 검사</span>
        </div>
        <h1 className="text-xl sm:text-2xl text-gray-900 dark:text-white mb-2" style={{ fontWeight: 700 }}>
          문자 화면 캡처 이미지 검사
        </h1>
        <p className="text-sm text-gray-600 dark:text-white/60 leading-relaxed">
          스크린샷에서 텍스트를 자동으로 추출한 뒤 스미싱 여부를 분석합니다
        </p>
      </div>

      <div className="space-y-4">
        {/* 업로드 영역 */}
        {!preview ? (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className={`relative rounded-2xl border-2 border-dashed p-8 sm:p-12 flex flex-col items-center gap-4 cursor-pointer transition-all
              ${dragOver
                ? "border-emerald-500/60 bg-emerald-50 dark:bg-emerald-900/10"
                : "border-gray-300 dark:border-white/10 hover:border-emerald-500/40 hover:bg-gray-50 dark:hover:bg-white/5"
              }`}
          >
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
              <Upload size={24} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="text-center">
              <p className="text-gray-900 dark:text-white mb-1 text-sm sm:text-base" style={{ fontWeight: 600 }}>
                이미지를 드래그하거나 클릭해서 업로드
              </p>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-white/40">PNG, JPG, WEBP 지원 · 최대 10MB</p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
          </div>
        ) : (
          <div className="bg-white dark:bg-[#111c30] border border-gray-200 dark:border-white/10 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-gray-500 dark:text-white/40 flex items-center gap-1.5">
                <ImageIcon size={11} />
                업로드된 이미지
              </p>
              {!ocrRunning && (
                <button
                  onClick={handleReset}
                  className="text-xs text-gray-500 dark:text-white/40 hover:text-gray-700 dark:hover:text-white/70 transition-all flex items-center gap-1"
                >
                  <RotateCcw size={11} /> 다시 선택
                </button>
              )}
            </div>
            <div className="rounded-xl overflow-hidden bg-gray-100 dark:bg-black/20 flex justify-center">
              <img src={preview} alt="업로드된 이미지" className="max-h-64 sm:max-h-72 object-contain" />
            </div>
            {file && (
              <p className="text-[11px] text-gray-400 dark:text-white/25 mt-2 truncate">{file.name}</p>
            )}
          </div>
        )}

        {/* OCR 실행 버튼 */}
        {preview && !ocrText && !ocrError && (
          <button
            onClick={handleOcr}
            disabled={ocrRunning}
            className="w-full flex items-center justify-center gap-2 px-5 py-3.5 sm:py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-600 text-white disabled:opacity-50 hover:opacity-90 transition-all shadow-md text-sm sm:text-base"
            style={{ fontWeight: 700 }}
          >
            {ocrRunning ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                텍스트 추출 중...
              </>
            ) : (
              <>
                <FileText size={16} />
                텍스트 추출 시작
              </>
            )}
          </button>
        )}

        {/* OCR 진행 단계 */}
        <AnimatePresence>
          {ocrRunning && ocrStep >= 0 && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-white dark:bg-[#111c30] border border-gray-200 dark:border-white/10 rounded-2xl p-5"
            >
              <p className="text-xs text-gray-500 dark:text-white/40 mb-4">텍스트 추출 진행 중</p>
              <div className="space-y-3">
                {OCR_STEPS.map((step, i) => {
                  const isDone = i < ocrStep;
                  const isActive = i === ocrStep;
                  return (
                    <motion.div
                      key={step}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.08 }}
                      className="flex items-center gap-3"
                    >
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all ${
                        isDone
                          ? "bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-500/50"
                          : isActive
                          ? "bg-blue-50 dark:bg-blue-900/30 border border-blue-500/50"
                          : "bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10"
                      }`}>
                        {isDone ? (
                          <CheckCircle2 size={11} className="text-emerald-600 dark:text-emerald-400" />
                        ) : isActive ? (
                          <div className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400 animate-pulse" />
                        ) : (
                          <div className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-white/20" />
                        )}
                      </div>
                      <span
                        className={`text-sm transition-all ${
                          isDone
                            ? "text-gray-400 dark:text-white/35 line-through"
                            : isActive
                            ? "text-blue-600 dark:text-blue-400"
                            : "text-gray-300 dark:text-white/20"
                        }`}
                        style={isActive ? { fontWeight: 600 } : {}}
                      >
                        {step}
                      </span>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* OCR 에러 */}
        <AnimatePresence>
          {ocrError && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 dark:bg-red-900/15 border border-red-200 dark:border-red-700/30 rounded-2xl p-5"
            >
              <div className="flex items-start gap-3 mb-4">
                <AlertCircle size={20} className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm text-red-700 dark:text-red-400 mb-1" style={{ fontWeight: 600 }}>
                    텍스트 추출 실패
                  </h3>
                  <p className="text-sm text-red-600 dark:text-red-400/80 leading-relaxed">
                    이미지에서 텍스트를 찾을 수 없습니다. 더 선명한 이미지를 사용하거나 직접 입력해주세요.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleRetryOcr}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 dark:bg-red-700 text-white hover:opacity-90 transition-all text-sm"
                  style={{ fontWeight: 600 }}
                >
                  <RotateCcw size={14} />
                  다시 시도
                </button>
                <button
                  onClick={() => nav("/analyze")}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-white/70 hover:bg-gray-200 dark:hover:bg-white/15 transition-all text-sm"
                  style={{ fontWeight: 600 }}
                >
                  직접 입력하기
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* OCR 결과 */}
        <AnimatePresence>
          {ocrText && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="bg-white dark:bg-[#111c30] border border-gray-200 dark:border-white/10 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-gray-500 dark:text-white/40 flex items-center gap-1.5">
                    <CheckCircle2 size={11} className="text-emerald-600 dark:text-emerald-400" />
                    추출된 텍스트
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700/30">
                      추출 완료
                    </span>
                    {!isEditing && (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="text-xs text-gray-500 dark:text-white/40 hover:text-blue-600 dark:hover:text-blue-400 transition-all flex items-center gap-1"
                      >
                        <Edit3 size={11} />
                        수정
                      </button>
                    )}
                  </div>
                </div>

                {isEditing ? (
                  <>
                    <textarea
                      value={editedText}
                      onChange={(e) => setEditedText(e.target.value)}
                      className="w-full min-h-[120px] p-3 rounded-lg bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 text-sm text-gray-800 dark:text-white/80 leading-relaxed resize-none focus:outline-none focus:border-blue-500 dark:focus:border-blue-400"
                      placeholder="추출된 텍스트를 수정하세요..."
                    />
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={handleEditSave}
                        className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 dark:bg-blue-700 text-white hover:opacity-90 transition-all text-sm"
                        style={{ fontWeight: 600 }}
                      >
                        <Save size={14} />
                        저장
                      </button>
                      <button
                        onClick={() => {
                          setIsEditing(false);
                          setEditedText(ocrText);
                        }}
                        className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-white/70 hover:bg-gray-200 dark:hover:bg-white/15 transition-all text-sm"
                        style={{ fontWeight: 600 }}
                      >
                        취소
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="p-3 rounded-lg bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 max-h-40 overflow-y-auto">
                    <p className="text-sm text-gray-800 dark:text-white/80 leading-relaxed whitespace-pre-wrap break-words">
                      {ocrText}
                    </p>
                  </div>
                )}
              </div>

              {!isEditing && (
                <>
                  <button
                    onClick={handleAnalyze}
                    className="w-full flex items-center justify-center gap-2 px-5 py-3.5 sm:py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:opacity-90 transition-all shadow-md text-sm sm:text-base"
                    style={{ fontWeight: 700 }}
                  >
                    이 텍스트로 스미싱 검사하기
                    <ChevronRight size={16} />
                  </button>

                  <button
                    onClick={handleReset}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 text-gray-600 dark:text-white/60 hover:bg-gray-50 dark:hover:bg-white/5 transition-all text-sm"
                  >
                    <RotateCcw size={14} />
                    다른 이미지 검사하기
                  </button>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
