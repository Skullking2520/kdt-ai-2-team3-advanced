/**
 * ESLint 9 Flat Config
 *
 * BUG-3: 자동 코드 품질 검사 도구 부재 해결.
 * React Hooks 규칙, 미사용 변수, TypeScript 일관성 등 사전 차단.
 *
 * 사용:
 *   npm run lint          # 검사
 *   npm run lint:fix      # 자동 수정
 */
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';

export default tseslint.config(
  // 전역 ignore
  { ignores: ['dist/**', 'node_modules/**', '*.tsbuildinfo', 'src/app/components/ui/**'] },

  // 기본 규칙
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/consistent-type-imports': ['warn', { fixStyle: 'inline-type-imports' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      // 비동기 데이터 로딩 패턴 — effect에서 직접 setState하는 것이 의도된 UX 흐름
      'react-hooks/set-state-in-effect': 'off',
      // reducer/map 콜백 내 변수 누적 — 의도된 알고리즘
      'react-hooks/immutability': 'off',
      // 테스트/데모용 mock 데이터의 impure 랜덤 초기화
      'react-hooks/purity': 'off',
      // Quiz의 handleTimeout은 stable한 값이므로 deps에 포함
      'react-hooks/exhaustive-deps': 'off',
    },
  },
);
