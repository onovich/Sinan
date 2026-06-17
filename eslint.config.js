import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const threeForbiddenMessage =
  'Only src/runtime/three and documented editor viewport glue may import three directly.';

export default tseslint.config(
  {
    ignores: ['dist', 'coverage', 'node_modules'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ['**/*.{js,mjs,cjs}'],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  {
    files: [
      'src/game/**/*.{ts,tsx}',
      'src/events/**/*.{ts,tsx}',
      'src/director/**/*.{ts,tsx}',
      'src/world/**/*.{ts,tsx}',
      'src/schemas/**/*.{ts,tsx}',
      'src/data/**/*.{ts,tsx}',
      'src/migrations/**/*.{ts,tsx}',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [{ name: 'three', message: threeForbiddenMessage }],
          patterns: [{ group: ['three/*'], message: threeForbiddenMessage }],
        },
      ],
    },
  },
);
