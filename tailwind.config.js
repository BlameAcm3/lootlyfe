/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './themes/**/*.{ts,tsx}',
    './constants/**/*.ts',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      // Generic theme tokens backed by CSS variables so theme packs can swap
      // palettes at runtime (see constants/theme.ts and global.css).
      // NOTE: alpha modifiers (e.g. bg-danger/50) do NOT work with these —
      // the values are plain CSS variables, not channel triples.
      colors: {
        'bg-base': 'var(--color-bg-base)',
        surface: 'var(--color-surface)',
        'surface-raised': 'var(--color-surface-raised)',
        border: 'var(--color-border)',
        'text-primary': 'var(--color-text-primary)',
        'text-muted': 'var(--color-text-muted)',
        'text-inverse': 'var(--color-text-inverse)',
        'accent-loot': 'var(--color-accent-loot)',
        'accent-progress': 'var(--color-accent-progress)',
        'accent-info': 'var(--color-accent-info)',
        danger: 'var(--color-danger)',
        'accent-achievement': 'var(--color-accent-achievement)',
      },
    },
  },
  plugins: [],
};
