import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Trophy, Flame, RefreshCw, ChevronRight, ShieldAlert, ShieldCheck, Timer, MessageSquare } from "lucide-react";

const QUESTIONS = [
  { id: 1, sender: "국민건강보험공단", message: "【국민건강보험】미납보험료 89,200원이 있습니다. 즉시 납부하지 않으면 급여가 정지됩니다. http://nhis-pay.kr/login", isPhishing: true, explanation: "공공기관은 URL 클릭을 요구하지 않습니다. 'nhis-pay.kr'은 공식 도메인(nhis.or.kr)이 아닙니다.", category: "공공기관 사칭" },
  { id: 2, sender: "SKT", message: "[SKT] 5월 이용요금 38,500원이 청구되었습니다. 자세한 내용은 T월드(www.tworld.co.kr)에서 확인하세요.", isPhishing: false, explanation: "공식 도메인(tworld.co.kr) 사용, 긴급성 없음, 정확한 요금 고지 형식입니다.", category: "정상" },
  { id: 3, sender: "010-8821-3947", message: "갤럭시S25 당첨! 48시간 내 수령 신청 필수 → http://prize-win.xyz/galaxy", isPhishing: true, explanation: "개인 번호 발신, 과도한 혜택, 의심 도메인(.xyz), 시간 압박이 전형적인 이벤트 사기 패턴입니다.", category: "이벤트 사기" },
  { id: 4, sender: "카카오뱅크", message: "[카카오뱅크] 홍길동님, 2025년 5월 이자 납입 안내드립니다. 앱에서 확인해주세요.", isPhishing: false, explanation: "이름 포함, 앱 유도(URL 없음), 공식 발신번호 형식의 정상 안내 문자입니다.", category: "정상" },
  { id: 5, sender: "경찰청112", message: "[경찰청] 귀하의 계좌가 범죄에 연루되었습니다. 즉시 출석하지 않으면 체포영장이 발부됩니다. 담당자: 010-3392-1847", isPhishing: true, explanation: "경찰은 문자로 출석 요구를 하지 않습니다. 개인 번호 제공, 공포 조성이 보이스피싱 전형 패턴입니다.", category: "기관 사칭" },
  { id: 6, sender: "CJ대한통운", message: "[CJ대한통운] 운송장 번호 123456789 배송이 완료되었습니다. 수령 장소: 경비실 (2025.05.01 14:23)", isPhishing: false, explanation: "운송장 번호, 정확한 배송 정보, URL 없음, 공식 발신번호 형식의 정상 택배 알림입니다.", category: "정상" },
  { id: 7, sender: "국세청", message: "【국세청】세금 환급금 237,400원이 발생하였습니다. 기한 내 미신청 시 소멸됩니다. http://hometax-refund.net", isPhishing: true, explanation: "국세청 공식 도메인은 hometax.go.kr입니다. 'hometax-refund.net'은 유사 도메인 피싱입니다.", category: "공공기관 사칭" },
  { id: 8, sender: "KB국민카드", message: "[KB국민카드] 5월 1일 스타벅스 4,500원 승인. 본인 미사용 시 1588-1688로 문의해주세요.", isPhishing: false, explanation: "실제 승인 내역, 공식 고객센터 번호, URL 없음의 정상 카드 승인 문자입니다.", category: "정상" },
  { id: 9, sender: "010-2938-5571", message: "저금리 정부지원 대출 최대 5천만원. 신용불량자 가능. 즉시 상담 → http://loan-gov.kr", isPhishing: true, explanation: "개인 번호 발신, 비현실적 조건, 의심 도메인, 즉시 행동 유도가 대출 사기 패턴입니다.", category: "대출 사기" },
  { id: 10, sender: "네이버", message: "[NAVER] 새로운 기기에서 로그인이 감지되었습니다. 본인이 아닐 경우 즉시 비밀번호를 변경하세요. (IP: 175.223.x.x)", isPhishing: false, explanation: "로그인 IP 정보 포함, URL 강요 없음, 정상적인 보안 알림 형식입니다.", category: "정상" },
];

const GRADES = [
  { min: 9, label: "피싱 탐정", color: "text-yellow-400", desc: "당신은 스미싱 전문가입니다!" },
  { min: 7, label: "보안 요원", color: "text-cyan-400", desc: "훌륭합니다! 조금만 더 연습하세요." },
  { min: 5, label: "일반 시민", color: "text-emerald-400", desc: "평균 수준입니다. 더 배워보세요!" },
  { min: 0, label: "요주의 대상", color: "text-red-400", desc: "피싱 문자에 주의가 필요합니다!" },
];

export function Quiz() {
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [answered, setAnswered] = useState<boolean | null>(null);
  const [correct, setCorrect] = useState<boolean | null>(null);
  const [finished, setFinished] = useState(false);
  const [results, setResults] = useState<{ correct: boolean; isPhishing: boolean }[]>([]);
  const [timeLeft, setTimeLeft] = useState(15);
  const [timerActive, setTimerActive] = useState(true);
  const [isTimeout, setIsTimeout] = useState(false);

  const q = QUESTIONS[idx];

  const handleTimeout = () => {
    if (answered !== null) return;
    setAnswered(null);
    setCorrect(false);
    setTimerActive(false);
    setStreak(0);
    setResults((p) => [...p, { correct: false, isPhishing: q.isPhishing }]);
  };

  useEffect(() => {
    if (!timerActive || answered !== null || finished) return;
    if (timeLeft <= 0) {
      setIsTimeout(true);
      handleTimeout();
      return;
    }
    const t = setTimeout(() => setTimeLeft((p) => p - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, timerActive, answered, finished, handleTimeout]);

  const handleAnswer = (guess: boolean | null) => {
    if (answered !== null && !isTimeout) return;
    const isCorrect = guess === q.isPhishing;
    setAnswered(guess);
    setCorrect(isCorrect);
    setTimerActive(false);
    const newStreak = isCorrect ? streak + 1 : 0;
    setStreak(newStreak);
    if (newStreak > maxStreak) setMaxStreak(newStreak);
    if (isCorrect) setScore((p) => p + (timeLeft > 10 ? 15 : timeLeft > 5 ? 10 : 5) + (streak >= 2 ? 5 : 0));
    setResults((p) => [...p, { correct: isCorrect, isPhishing: q.isPhishing }]);
  };

  const handleNext = () => {
    if (idx + 1 >= QUESTIONS.length) { setFinished(true); return; }
    setIdx((p) => p + 1);
    setAnswered(null);
    setCorrect(null);
    setTimeLeft(15);
    setTimerActive(true);
    setIsTimeout(false);
  };

  const handleRestart = () => {
    setIdx(0); setScore(0); setStreak(0); setMaxStreak(0);
    setAnswered(null); setCorrect(null); setFinished(false);
    setResults([]); setTimeLeft(15); setTimerActive(true); setIsTimeout(false);
  };

  const grade = GRADES.find((g) => score >= g.min * 10) ?? GRADES[GRADES.length - 1];
  const correctCount = results.filter((r) => r.correct).length;

  if (finished) {
    return (
      <div className="px-4 sm:px-6 py-8 max-w-2xl mx-auto">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-[#111c30] border border-gray-200 dark:border-white/10 rounded-2xl p-8 text-center">
          <p className={`text-2xl mb-1 ${grade.color}`} style={{ fontWeight: 700 }}>{grade.label}</p>
          <p className="text-sm text-gray-500 dark:text-white/40 mb-6">{grade.desc}</p>
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { label: "최종 점수", value: score, suffix: "점" },
              { label: "정답률", value: `${Math.round((correctCount / QUESTIONS.length) * 100)}`, suffix: "%" },
              { label: "최대 연속", value: maxStreak, suffix: "연속" },
            ].map((s) => (
              <div key={s.label} className="bg-gray-50 dark:bg-white/5 rounded-xl p-3">
                <p className="text-[11px] text-gray-400 dark:text-white/30">{s.label}</p>
                <p className="text-gray-900 dark:text-white mt-0.5" style={{ fontWeight: 700, fontSize: "1.4rem" }}>{s.value}<span className="text-xs text-gray-400 dark:text-white/40 ml-0.5">{s.suffix}</span></p>
              </div>
            ))}
          </div>
          <div className="flex gap-2 justify-center mb-4">
            {results.map((r, i) => (
              <div key={i} className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${r.correct ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
                {r.correct ? "✓" : "✗"}
              </div>
            ))}
          </div>
          <button onClick={handleRestart}
            className="flex items-center gap-2 mx-auto px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-sm shadow-lg shadow-cyan-500/20 hover:opacity-90 transition-all">
            <RefreshCw size={13} /> 다시 도전
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 py-8 max-w-2xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Trophy size={14} className="text-yellow-500 dark:text-yellow-400" />
          <span className="text-xs text-yellow-600 dark:text-yellow-400 tracking-widest uppercase">스미싱 탐지 퀴즈</span>
        </div>
        <h1 className="text-gray-900 dark:text-white mb-1" style={{ fontWeight: 700, fontSize: "1.5rem" }}>피싱 문자 맞히기</h1>
        <p className="text-sm text-gray-500 dark:text-white/40">피싱인지 정상 문자인지 맞혀보세요!</p>
      </div>

      {/* Progress & score */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex-1 h-1.5 rounded-full bg-gray-200 dark:bg-white/8 overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500"
            style={{ width: `${((idx) / QUESTIONS.length) * 100}%` }} />
        </div>
        <span className="text-xs text-gray-400 dark:text-white/40 shrink-0">{idx + 1} / {QUESTIONS.length}</span>
        <div className="flex items-center gap-1 shrink-0">
          <Trophy size={11} className="text-yellow-500 dark:text-yellow-400" />
          <span className="text-xs text-yellow-600 dark:text-yellow-400" style={{ fontWeight: 600 }}>{score}점</span>
        </div>
        {streak >= 2 && (
          <div className="flex items-center gap-1 shrink-0">
            <Flame size={11} className="text-orange-500 dark:text-orange-400" />
            <span className="text-xs text-orange-600 dark:text-orange-400">{streak}연속</span>
          </div>
        )}
      </div>

      {/* Timer */}
      <div className="flex items-center gap-2 mb-4">
        <Timer size={11} className={timeLeft <= 5 ? "text-red-500 dark:text-red-400" : "text-gray-300 dark:text-white/30"} />
        <div className="flex-1 h-1 rounded-full bg-gray-200 dark:bg-white/8 overflow-hidden">
          <motion.div className="h-full rounded-full transition-all"
            style={{ width: `${(timeLeft / 15) * 100}%`, backgroundColor: timeLeft <= 5 ? "#ef4444" : timeLeft <= 10 ? "#f97316" : "#22c55e" }} />
        </div>
        <span className={`text-xs w-5 ${timeLeft <= 5 ? "text-red-500 dark:text-red-400" : "text-gray-400 dark:text-white/30"}`}>{timeLeft}s</span>
      </div>

      {/* SMS card */}
      <AnimatePresence mode="wait">
        <motion.div key={idx} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
          className="bg-white dark:bg-[#111c30] border border-gray-200 dark:border-white/10 rounded-2xl p-5 mb-5">
          <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-100 dark:border-white/8">
            <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center text-sm"><MessageSquare size={14} className="text-cyan-500 dark:text-cyan-400" /></div>
            <div>
              <p className="text-xs text-gray-700 dark:text-white/70" style={{ fontWeight: 500 }}>{q.sender}</p>
              <p className="text-[10px] text-gray-400 dark:text-white/25">방금 전</p>
            </div>
          </div>
          <p className="text-sm text-gray-800 dark:text-white/80 leading-relaxed">{q.message}</p>
        </motion.div>
      </AnimatePresence>

      {/* Answer buttons */}
      {answered === null && !isTimeout ? (
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => handleAnswer(true)}
            className="flex items-center justify-center gap-2 py-4 rounded-xl bg-red-500/15 border border-red-500/25 text-red-400 dark:text-red-400 hover:bg-red-500/25 transition-all text-sm">
            <ShieldAlert size={16} /> 피싱 문자
          </button>
          <button onClick={() => handleAnswer(false)}
            className="flex items-center justify-center gap-2 py-4 rounded-xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 dark:text-emerald-400 hover:bg-emerald-500/25 transition-all text-sm">
            <ShieldCheck size={16} /> 정상 문자
          </button>
        </div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className={`rounded-xl border p-4 mb-4 ${isTimeout ? "bg-orange-500/8 border-orange-500/25" : correct ? "bg-emerald-500/8 border-emerald-500/25" : "bg-red-500/8 border-red-500/25"}`}>
          <div className="flex items-center gap-2 mb-2">
            {isTimeout ? <ShieldAlert size={18} className="text-orange-400" /> : correct ? <ShieldCheck size={18} className="text-emerald-400" /> : <ShieldAlert size={18} className="text-red-400" />}
            <p className={`text-sm ${isTimeout ? "text-orange-400" : correct ? "text-emerald-400" : "text-red-400"}`} style={{ fontWeight: 600 }}>
              {isTimeout ? "시간 초과!" : correct ? "정답!" : "오답!"}
              {correct && <span className="ml-2 text-yellow-400">+{timeLeft > 10 ? 15 : timeLeft > 5 ? 10 : 5}{streak >= 2 ? "+5" : ""}점</span>}
            </p>
            <span className="ml-auto text-[11px] px-2 py-0.5 rounded bg-white/5 text-white/40 dark:text-white/40">{q.category}</span>
          </div>
          {isTimeout && (
            <div className="mb-2 pb-2 border-b border-gray-200 dark:border-white/10">
              <p className="text-xs text-orange-600 dark:text-orange-400" style={{ fontWeight: 600 }}>정답: {q.isPhishing ? "피싱 문자" : "정상 문자"}</p>
            </div>
          )}
          <p className="text-xs text-gray-600 dark:text-white/55 leading-relaxed">{q.explanation}</p>
          <button onClick={handleNext}
            className="mt-3 flex items-center gap-1.5 text-xs text-gray-500 dark:text-white/50 hover:text-gray-700 dark:hover:text-white/80 transition-all ml-auto">
            {idx + 1 >= QUESTIONS.length ? "결과 보기" : "다음 문제"} <ChevronRight size={12} />
          </button>
        </motion.div>
      )}
    </div>
  );
}
