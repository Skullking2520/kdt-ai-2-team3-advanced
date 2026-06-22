import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router";
import { Shield, Eye, EyeOff } from "lucide-react";
import { useAdmin } from "@/app/context/AdminContext";

/**
 * 어드민 로그인 페이지 (/admin)
 * - useAdmin() hook으로 AdminContext 사용 → STORAGE_KEY "nb_admin_auth" + "true" 값 자동 일치
 * - 비밀번호는 VITE_ADMIN_PASSWORD 환경변수 (.env: newbiz2026)
 * - 성공 시: AdminContext.login() → isAdmin=true + localStorage "nb_admin_auth"="true"
 *   → routes.admin.tsx adminGuard 통과 + Dashboard 렌더
 * - 실패 시: "비밀번호가 일치하지 않습니다" 메시지
 * - 이미 인증된 상태로 진입 시 useEffect로 /dashboard 자동 navigate
 *
 * 회귀 이력:
 * - 첫 commit (e2362f6) 에서 AdminLogin이 자체 ADMIN_TOKEN_KEY="newbiz_admin_token" + 임의 토큰 값 사용
 *   → AdminContext의 "nb_admin_auth"="true" 와 불일치 → Dashboard 진입해도 adminGuard 통과 못함
 *   → Layout/Dashboard 모두 어드민 상태 미인식 → 빈 화면
 * - 본 픽스: AdminContext.useAdmin() 사용으로 키/값 일치 + 단일 진실 출처 (single source of truth)
 */
export function AdminLogin() {
  const navigate = useNavigate();
  const { isAdmin, login } = useAdmin();
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAdmin) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAdmin, navigate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setLoading(true);

    const success = login(password);
    if (success) {
      // isAdmin useEffect가 navigate("/dashboard") 처리
    } else {
      setErr("비밀번호가 일치하지 않습니다");
      setLoading(false);
      setPassword("");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-[#0a0f1c] dark:to-[#0a0f1c]">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
            <Shield size={20} className="text-white" />
          </div>
          <div className="text-left">
            <p className="text-sm text-gray-900 dark:text-white" style={{ fontWeight: 700 }}>
              NewBiz Shield
            </p>
            <p className="text-[10px] text-gray-500 dark:text-white/40">어드민 로그인</p>
          </div>
        </Link>

        <div className="bg-white dark:bg-[#111c30] border border-gray-200 dark:border-white/10 rounded-2xl p-6 sm:p-8">
          <div className="mb-6">
            <h1 className="text-xl text-gray-900 dark:text-white mb-1" style={{ fontWeight: 700 }}>
              관리자 페이지
            </h1>
            <p className="text-sm text-gray-500 dark:text-white/60">운영팀 비밀번호를 입력하세요</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                className="block text-xs text-gray-600 dark:text-white/70 mb-1.5"
                style={{ fontWeight: 600 }}
              >
                비밀번호
              </label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoFocus
                  required
                  className="w-full px-4 py-2.5 pr-10 bg-white dark:bg-[#0a1424] border border-gray-300 dark:border-white/10 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  placeholder="비밀번호 입력"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-white/70"
                  aria-label={showPw ? "비밀번호 숨기기" : "비밀번호 표시"}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {err && (
              <div className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
                <p className="text-xs text-red-600 dark:text-red-400">{err}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || password.length === 0}
              className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg text-sm hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              style={{ fontWeight: 600 }}
            >
              {loading ? "로그인 중..." : "로그인"}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-white/10">
            <Link
              to="/"
              className="block text-center text-xs text-gray-500 dark:text-white/60 hover:text-gray-700 dark:hover:text-white/80"
            >
              ← 홈으로 돌아가기
            </Link>
          </div>
        </div>

        <p className="text-center text-[10px] text-gray-400 dark:text-white/40 mt-4">
          학원 데모용 · 관리자 전용 페이지
        </p>
      </div>
    </div>
  );
}
