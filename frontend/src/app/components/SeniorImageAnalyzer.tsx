import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router";
import {
  ImageIcon, Upload, FileText, ChevronRight, RotateCcw,
  CheckCircle2, Loader2, AlertCircle, Edit3, Save, ShieldAlert, Flag,
} from "lucide-react";
import { useSenior } from "@/app/context/SeniorContext";
import { selectImageFiles } from "@/lib/imageFiles";
import { api } from "@/lib/api";

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

const OCR_STEPS = [
  "이미지 로딩 중",
  "텍스트 영역 인식 중",
  "글자 추출 중",
  "완료",
];

// MOCK_OCR_RESULTS 제거됨

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

interface SelectedImage {
  file: File;
  preview: string;
}

/**
 * 시니어용 이미지 분석기 — SeniorAnalyzer 디자인 언어를 따름
 * ImageAnalyzer.tsx를 기반으로 큰 글씨, 단순 UI, 높은 대비 적용
 */
export function SeniorImageAnalyzer() {
  const [images, setImages] = useState<SelectedImage[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [ocrStep, setOcrStep] = useState(-1);
  const [ocrRunning, setOcrRunning] = useState(false);
  const [ocrText, setOcrText] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [ocrError, setOcrError] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const nav = useNavigate();
  const { senior: seniorMode } = useSenior();
  const selectedImage = images[selectedIndex] ?? null;

  const resetOcrState = () => {
    setOcrStep(-1);
    setOcrText(null);
    setOcrRunning(false);
    setOcrError(false);
    setIsEditing(false);
    setEditedText("");
  };

  const handleFiles = (files: File[]) => {
    const result = selectImageFiles(files, MAX_IMAGE_BYTES);
    if (result.accepted.length === 0) {
      alert("이미지 파일만 올릴 수 있고, 파일 크기는 10MB 이하여야 합니다.");
      return;
    }
    images.forEach((img) => URL.revokeObjectURL(img.preview));
    setImages(result.accepted.map((file) => ({ file, preview: URL.createObjectURL(file) })));
    setSelectedIndex(0);
    resetOcrState();
    if (result.rejected.length > 0) {
      alert(`조건에 맞지 않는 사진 ${result.rejected.length}개는 제외했습니다.`);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(Array.from(e.dataTransfer.files));
  }, [images]);

  const handleSelectImage = (index: number) => {
    if (ocrRunning || index === selectedIndex) return;
    setSelectedIndex(index);
    resetOcrState();
  };

  const handleOcr = async () => {
    if (!selectedImage || ocrRunning) return;
    setOcrRunning(true);
    setOcrStep(0);
    setOcrText(null);
    setOcrError(false);

    try {
      const base64Image = await fileToBase64(selectedImage.file);
      setOcrStep(1);

      await new Promise((r) => setTimeout(r, 400));
      setOcrStep(2);

      const resp = await api.ocr(base64Image);

      setOcrStep(3);
      await new Promise((r) => setTimeout(r, 300));

      setOcrText(resp.text);
      setEditedText(resp.text);
    } catch (e) {
      console.error("[OCR Failed]", e);
      setOcrError(true);
    } finally {
      setOcrRunning(false);
    }
  };

  const handleAnalyze = () => {
    const textToAnalyze = isEditing ? editedText : ocrText;
    if (!textToAnalyze || !textToAnalyze.trim()) return;
    nav(`/analyze/progress?text=${encodeURIComponent(textToAnalyze)}&type=image`);
  };

  const handleReset = () => {
    images.forEach((img) => URL.revokeObjectURL(img.preview));
    setImages([]);
    setSelectedIndex(0);
    resetOcrState();
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
    <div className="min-h-full">
      {/* 상단 툴바 — seniorMode일 때 숨김 (SeniorBottomBar 제공) */}
      {!seniorMode && (
        <div className="sticky top-0 z-20 bg-white dark:bg-[#0b1120]/95 backdrop-blur border-b-2 border-slate-200 dark:border-white/10 px-4 py-3">
          <div className="max-w-3xl mx-auto flex items-center gap-2 flex-wrap">
            <button
              onClick={() => window.history.length > 1 ? window.history.back() : nav("/")}
              className="flex items-center gap-2 px-4 py-3 rounded-xl bg-slate-200 dark:bg-white/8 border-2 border-slate-300 dark:border-white/15 text-slate-900 dark:text-white hover:bg-slate-300 dark:bg-white/15 active:scale-95 transition-all"
              style={{ fontSize: "1.05rem", fontWeight: 600 }}
            >
              <RotateCcw size={22} /> 뒤로
            </button>
            <button
              onClick={() => nav("/senior-home")}
              className="flex items-center gap-2 px-4 py-3 rounded-xl bg-slate-200 dark:bg-white/8 border-2 border-slate-300 dark:border-white/15 text-slate-900 dark:text-white hover:bg-slate-300 dark:bg-white/15 active:scale-95 transition-all"
              style={{ fontSize: "1.05rem", fontWeight: 600 }}
            >
              🏠 처음
            </button>
            <div className="ml-auto" />
          </div>
        </div>
      )}

      <div className="max-w-3xl mx-auto px-6 py-8 pb-32">

        {/* 헤더 */}
        <div className="text-center mb-8">
          <div className="inline-flex w-16 h-16 rounded-2xl bg-emerald-600 items-center justify-center shadow-lg mb-4">
            <ImageIcon size={32} className="text-white" />
          </div>
          <h1 className="text-slate-900 dark:text-white mb-2 text-4xl" style={{ fontWeight: 700, lineHeight: 1.2 }}>
            문자 사진 검사
          </h1>
          <p className="text-slate-600 dark:text-white/75 text-lg" style={{ lineHeight: 1.5 }}>
            문자 사진(스크린샷)을 올리면 위험한지 알려드려요
          </p>
        </div>

        {/* 안내 */}
        <div className="rounded-2xl bg-blue-500/10 border-2 border-blue-500/25 p-5 mb-6">
          <p className="text-blue-600 dark:text-blue-200 text-base" style={{ lineHeight: 1.5 }}>
            <strong>방법:</strong> 의심스러운 문자의 스크린샷을 찍어서 아래에 올려주세요
          </p>
        </div>

        <div className="space-y-4">
          {/* 업로드 영역 */}
          {!selectedImage ? (
<label
            htmlFor="file-input-senior-image"
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`relative rounded-3xl border-3 border-dashed p-10 sm:p-14 flex flex-col items-center gap-5 cursor-pointer transition-all
              ${dragOver
                ? "border-emerald-500/60 bg-emerald-50 dark:bg-emerald-900/10"
                : "border-slate-300 dark:border-white/15 hover:border-emerald-500/50 hover:bg-slate-50 dark:hover:bg-white/5"
              }`}
          >
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
              <Upload size={40} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="text-center">
              <p className="text-slate-900 dark:text-white mb-2 text-2xl" style={{ fontWeight: 700 }}>
                사진을 터치하거나 드래그하세요
              </p>
              <p className="text-slate-500 dark:text-white/50 text-lg">PNG, JPG, WEBP 지원 · 최대 10MB</p>
            </div>
            <input
              id="file-input-senior-image"
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              aria-label="이미지 파일 선택"
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              onChange={(e) => {
                handleFiles(Array.from(e.target.files ?? []));
                e.currentTarget.value = "";
              }}
            />
          </label>
          ) : (
            <div className="bg-slate-50 dark:bg-[#111c30] border-2 border-slate-300 dark:border-white/15 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-slate-500 dark:text-white/50 flex items-center gap-2 text-base" style={{ fontWeight: 600 }}>
                  <ImageIcon size={16} />
                  올라간 사진
                </p>
                {!ocrRunning && (
                  <button
                    onClick={handleReset}
                    className="text-base text-slate-500 dark:text-white/50 hover:text-slate-700 dark:hover:text-white/80 transition-all flex items-center gap-1.5"
                    style={{ fontWeight: 600 }}
                  >
                    <RotateCcw size={14} /> 다시 선택
                  </button>
                )}
              </div>
              <div className="rounded-xl overflow-hidden bg-gray-100 dark:bg-black/20 flex justify-center">
                <img src={selectedImage.preview} alt="업로드된 이미지" className="max-h-80 sm:max-h-96 object-contain" />
              </div>
              <p className="text-xs text-slate-400 dark:text-white/30 mt-2 truncate">{selectedImage.file.name}</p>
              {images.length > 1 && (
                <div className="mt-4 grid grid-cols-3 sm:grid-cols-5 gap-3">
                  {images.map((img, index) => (
                    <button
                      key={`${img.file.name}-${index}`}
                      onClick={() => handleSelectImage(index)}
                      disabled={ocrRunning}
                      className={`relative aspect-square overflow-hidden rounded-xl border-2 transition-all ${
                        index === selectedIndex
                          ? "border-emerald-500 ring-4 ring-emerald-500/20"
                          : "border-slate-300 dark:border-white/15 opacity-75 hover:opacity-100"
                      }`}
                      title={img.file.name}
                    >
                      <img src={img.preview} alt={`${img.file.name} 미리보기`} className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* OCR 실행 버튼 */}
          {selectedImage && !ocrText && !ocrError && (
            <button
              onClick={handleOcr}
              disabled={ocrRunning}
              className="w-full flex items-center justify-center gap-3 px-6 py-5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white disabled:opacity-50 hover:opacity-90 transition-all shadow-lg text-2xl"
              style={{ fontWeight: 700, lineHeight: 1.2 }}
            >
              {ocrRunning ? (
                <>
                  <Loader2 size={24} className="animate-spin" />
                  글자 찾기 중...
                </>
              ) : (
                <>
                  <FileText size={24} />
                  글자 추출하기
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
                className="bg-slate-50 dark:bg-[#111c30] border-2 border-slate-300 dark:border-white/15 rounded-2xl p-6"
              >
                <p className="text-slate-500 dark:text-white/50 mb-5 text-lg" style={{ fontWeight: 600 }}>
                  글자 찾는 중
                </p>
                <div className="space-y-4">
                  {OCR_STEPS.map((step, i) => {
                    const isDone = i < ocrStep;
                    const isActive = i === ocrStep;
                    return (
                      <motion.div
                        key={step}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.08 }}
                        className="flex items-center gap-4"
                      >
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all ${
                          isDone
                            ? "bg-emerald-50 dark:bg-emerald-900/30 border-2 border-emerald-500/50"
                            : isActive
                            ? "bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-500/50"
                            : "bg-slate-100 dark:bg-white/5 border-2 border-slate-200 dark:border-white/10"
                        }`}>
                          {isDone ? (
                            <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400" />
                          ) : isActive ? (
                            <div className="w-3 h-3 rounded-full bg-blue-600 dark:bg-blue-400 animate-pulse" />
                          ) : (
                            <div className="w-2 h-2 rounded-full bg-slate-300 dark:bg-white/20" />
                          )}
                        </div>
                        <span
                          className={`text-lg transition-all ${
                            isDone
                              ? "text-slate-400 dark:text-white/35 line-through"
                              : isActive
                              ? "text-blue-600 dark:text-blue-400"
                              : "text-slate-300 dark:text-white/20"
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
                className="bg-red-500/15 border-3 border-red-500/40 rounded-2xl p-6"
              >
                <div className="flex items-start gap-4 mb-5">
                  <AlertCircle size={26} className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-lg text-red-700 dark:text-red-400 mb-2" style={{ fontWeight: 700 }}>
                      글자를 찾을 수 없습니다
                    </h3>
                    <p className="text-base text-red-600 dark:text-red-400/80 leading-relaxed">
                      사진이 선명하지 않으면 글자를 못 찾을 수 있어요.<br />
                      더 또렷한 사진을 다시 올려보세요.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleRetryOcr}
                    className="flex-1 flex items-center justify-center gap-2 px-5 py-4 rounded-2xl bg-red-600 dark:bg-red-700 text-white hover:opacity-90 transition-all text-lg"
                    style={{ fontWeight: 700 }}
                  >
                    <RotateCcw size={18} />
                    다시 시도
                  </button>
                  <button
                    onClick={() => nav("/senior-analyze")}
                    className="flex-1 flex items-center justify-center gap-2 px-5 py-4 rounded-2xl bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-white/80 hover:bg-slate-200 dark:hover:bg-white/15 transition-all text-lg"
                    style={{ fontWeight: 700 }}
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
                <div className="bg-slate-50 dark:bg-[#111c30] border-2 border-slate-300 dark:border-white/15 rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-slate-500 dark:text-white/50 flex items-center gap-2 text-base" style={{ fontWeight: 600 }}>
                      <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400" />
                      찾은 글자
                    </p>
                    <div className="flex items-center gap-3">
                      <span className="text-sm px-3 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700/30">
                        추출 완료
                      </span>
                      {!isEditing && (
                        <button
                          onClick={() => setIsEditing(true)}
                          className="text-base text-slate-500 dark:text-white/50 hover:text-blue-600 dark:hover:text-blue-400 transition-all flex items-center gap-1.5"
                          style={{ fontWeight: 600 }}
                        >
                          <Edit3 size={14} />
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
                        className="w-full min-h-[140px] p-4 rounded-xl bg-slate-100 dark:bg-black/30 border-2 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white/90 leading-relaxed resize-none focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 transition-all text-lg"
                        placeholder="찾은 글자를 수정하세요..."
                        style={{ lineHeight: 1.6 }}
                      />
                      <div className="flex gap-3 mt-4">
                        <button
                          onClick={handleEditSave}
                          className="flex-1 flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-blue-600 dark:bg-blue-700 text-white hover:opacity-90 transition-all text-lg"
                          style={{ fontWeight: 700 }}
                        >
                          <Save size={16} />
                          저장
                        </button>
                        <button
                          onClick={() => {
                            setIsEditing(false);
                            setEditedText(ocrText);
                          }}
                          className="px-5 py-3.5 rounded-xl bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-white/80 hover:bg-slate-300 dark:hover:bg-white/15 transition-all text-lg"
                          style={{ fontWeight: 600 }}
                        >
                          취소
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="p-4 rounded-xl bg-slate-100 dark:bg-black/30 border-2 border-slate-200 dark:border-white/10 max-h-48 overflow-y-auto">
                      <p className="text-slate-800 dark:text-white/85 leading-relaxed whitespace-pre-wrap break-words text-lg" style={{ lineHeight: 1.7 }}>
                        {ocrText}
                      </p>
                    </div>
                  )}
                </div>

                {!isEditing && (
                  <>
                    <button
                      onClick={handleAnalyze}
                      className="w-full flex items-center justify-center gap-3 px-6 py-5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:opacity-90 transition-all shadow-lg text-2xl"
                      style={{ fontWeight: 700, lineHeight: 1.2 }}
                    >
                      <ShieldAlert size={26} />
                      위험한지 검사하기
                      <ChevronRight size={24} />
                    </button>

                    <button
                      onClick={() => nav("/report")}
                      className="w-full flex items-center justify-center gap-3 px-5 py-4 rounded-2xl border-2 border-red-300 dark:border-red-700/40 text-red-700 dark:text-red-200 hover:bg-red-50 dark:hover:bg-red-900/15 transition-all text-xl"
                      style={{ fontWeight: 700, lineHeight: 1.2 }}
                    >
                      <Flag size={22} />
                      신고하기
                    </button>

                    <button
                      onClick={handleReset}
                      className="w-full flex items-center justify-center gap-3 px-5 py-4 rounded-2xl border-2 border-slate-300 dark:border-white/15 text-slate-600 dark:text-white/70 hover:bg-slate-100 dark:hover:bg-white/5 transition-all text-xl"
                      style={{ fontWeight: 600 }}
                    >
                      <RotateCcw size={20} />
                      다른 사진 검사하기
                    </button>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
