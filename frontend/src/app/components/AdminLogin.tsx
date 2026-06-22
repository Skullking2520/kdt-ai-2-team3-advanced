import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { Shield, Lock, Eye, EyeOff, ArrowRight, AlertCircle, ArrowLeft } from "lucide-react";
import { useAdmin } from "../context/AdminContext";

export function AdminLogin() {
  const { isAdmin, login } = useAdmin();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // 이미 어드민 로그인된 상태면 대시보드로 자동 이동
  useEffect(() => {
    if (isAdmin) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAdmin, navigate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!password.trim()) return;
    setSubmitting(true);
    // 약간의 delay로 자연스러운 UX
    setTimeout(() => {
      const ok = login(password);
      if (ok) {
        navigate("/dashboard", { replace: true });
      } else {
        setError("비밀번호가 올바르지 않습니다.");
        setSubmitting(false);
      }
    }, 200);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 bg-white dark:bg-[#0b1120]">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#111c30] p-8 shadow-sm">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center mb-4">
              <Shield size={28} className="text-blue-400" />
            </div>
            <h1 className="text-gray-900 dark:text-white text-xl" style={{ fontWeight: 700 }}>관리자 로그인</h1>
            <p className="text-sm text-gray-500 dark:text-white/40 mt-2 leading-relaxed">
              NewBiz Shield 운영 도구(대시보드·비교·헬스체크)에<br />접근하려면 관리자 비밀번호를 입력하세요
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] text-gray-500 dark:text-white/40 mb-1.5">관리자 비밀번호</label>
              <div className="flex items-center gap-2 bg-gray-50 dark:bg-[#0b1120] border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2.5 focus-within:border-blue-500/50 transition-colors">
                <Lock size={14} className="text-gray-400 dark:text-white/30 shrink-0" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="비밀번호 입력..."
                  autoFocus
                  className="flex-1 bg-transparent text-sm text-gray-900 dark:text-white/80 placeholder:text-gray-400 dark:placeholder:text-white/20 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-gray-400 dark:text-white/30 hover:text-gray-600 dark:hover:text-white/60 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-xs text-red-700 dark:text-red-400">
                <AlertCircle size={12} className="shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={!password.trim() || submitting}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-white/10 disabled:cursor-not-allowed text-white text-sm transition-colors"
              style={{ fontWeight: 600 }}
            >
              {submitting ? (
                <>
                  <div className="w-3.5 h-3.5 border border-white/30 border-t-white rounded-full animate-spin" />
                  확인 중...
                </>
              ) : (
                <>
                  로그인
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-100 dark:border-white/8">
            <p className="text-[10px] text-gray-400 dark:text-white/30 text-center leading-relaxed">
              어드민 페이지는 DEV 빌드에서만 접근 가능하며,<br />
              운영팀 승인 후에만 활성화됩니다.
            </p>
            <button
              type="button"
              onClick={() => navigate("/")}
              className="mt-3 w-full flex items-center justify-center gap-1 text-[11px] text-gray-500 dark:text-white/40 hover:text-gray-700 dark:hover:text-white/70 transition-colors"
            >
              <ArrowLeft size={11} />
              홈으로 돌아가기
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
