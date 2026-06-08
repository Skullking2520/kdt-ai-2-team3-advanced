import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface AdminContextType {
  isAdmin: boolean;
  login: (password: string) => boolean;
  logout: () => void;
}

const AdminContext = createContext<AdminContextType>({
  isAdmin: false,
  login: () => false,
  logout: () => {},
});

// 관리자 비밀번호는 VITE_ADMIN_PASSWORD 환경변수에서 로드.
// 미설정 시 로그인 기능 비활성 (prod에서는 .env에 반드시 설정 권장).
const ADMIN_PASSWORD = (import.meta.env.VITE_ADMIN_PASSWORD as string | undefined) ?? "";
const STORAGE_KEY = "nb_admin_auth";

export function AdminProvider({ children }: { children: ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });

  const login = (password: string) => {
    if (!ADMIN_PASSWORD) {
      // eslint-disable-next-line no-console
      console.warn("[AdminContext] VITE_ADMIN_PASSWORD not set; admin login disabled.");
      return false;
    }
    if (password === ADMIN_PASSWORD) {
      setIsAdmin(true);
      localStorage.setItem(STORAGE_KEY, "true");
      return true;
    }
    return false;
  };

  const logout = () => {
    setIsAdmin(false);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <AdminContext.Provider value={{ isAdmin, login, logout }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  return useContext(AdminContext);
}
