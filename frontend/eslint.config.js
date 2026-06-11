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
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/consistent-type-imports': 'warn',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
);
