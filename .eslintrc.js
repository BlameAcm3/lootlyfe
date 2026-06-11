module.exports = {
  root: true,
  env: {
    es2022: true,
    node: true,
  },
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'prettier'],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  // supabase/functions is Deno code (Deno globals, npm: specifiers) checked
  // by the Supabase CLI, not by the app's tsc/eslint.
  ignorePatterns: ['dist', 'node_modules', 'supabase/functions'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',
  },
};
