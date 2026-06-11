/**
 * NewBiz Shield — 시니어 모드 전역 상태
 * ─────────────────────────────────
 * - localStorage 키: nb:senior (true | false)
 * - true일 때 <html>에 .senior-mode 클래스 자동 부여
 * - false로 바뀌면 클래스 제거
 *
 * 사용법:
 *   import { useSenior } from '@/app/context/SeniorContext';
 *   const { senior, toggle, setSenior } = useSenior();
 */

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

const STORAGE_KEY = "nb:senior";

interface SeniorContextType {
  senior: boolean;
  toggle: () => void;
  setSenior: (v: boolean) => void;
}

const SeniorContext = createContext<SeniorContextType>({
  senior: false,
  toggle: () => {},
  setSenior: () => {},
});

export function SeniorProvider({ children }: { children: ReactNode }) {
  const [senior, setSeniorState] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });

  // state → localStorage + html class 동기화
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, senior ? "true" : "false");
    } catch {
      /* localStorage 사용 불가 환경 무시 */
    }
    document.documentElement.classList.toggle("senior-mode", senior);
  }, [senior]);

  // 다른 탭/창에서 localStorage 변경 시 동기화 (storage event)
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      const next = e.newValue === "true";
      setSeniorState(next);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // 페이지 가시성 복귀 시 localStorage와 state 일치 확인 (백그라운드 탭 동기화)
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      try {
        const stored = localStorage.getItem(STORAGE_KEY) === "true";
        if (stored !== senior) setSeniorState(stored);
      } catch {
        /* 무시 */
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [senior]);

  const value: SeniorContextType = {
    senior,
    toggle: () => setSeniorState((v) => !v),
    setSenior: (v) => setSeniorState(v),
  };

  return <SeniorContext.Provider value={value}>{children}</SeniorContext.Provider>;
}

export function useSenior() {
  return useContext(SeniorContext);
}
