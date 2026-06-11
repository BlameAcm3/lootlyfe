import { vars } from 'nativewind';

/**
 * Generic, theme-agnostic color token names. Every theme pack supplies a value
 * for every token — components only ever reference token names (via NativeWind
 * classes like `bg-bg-base` or `text-text-primary`), never pack-specific colors.
 *
 * The original seven tokens come from AGENTS.md; `surface`, `text-muted`, and
 * `text-inverse` were added so UI primitives (Card, Button, Input) never need
 * a hardcoded hex.
 */
export const themeTokens = [
  'bg-base',
  'surface',
  'surface-raised',
  'border',
  'text-primary',
  'text-muted',
  'text-inverse',
  'accent-loot',
  'accent-progress',
  'accent-info',
  'danger',
  'accent-achievement',
] as const;

export type ThemeToken = (typeof themeTokens)[number];

export type Palette = Record<ThemeToken, string>;

/**
 * High-fantasy pack palette — the app-wide defaults. Keep in sync with the
 * `:root` CSS variables in global.css.
 */
export const highFantasyPalette: Palette = {
  'bg-base': '#f6edd8', // parchment
  surface: '#fdf7e9', // lighter parchment (cards)
  'surface-raised': '#fffdf6', // brightest parchment (elevated)
  border: '#e6d8b8', // parchment edge
  'text-primary': '#2a2018', // ink
  'text-muted': '#6b5d4a', // faded ink
  'text-inverse': '#fdf7e9', // parchment on accents
  'accent-loot': '#c9a227', // gold
  'accent-progress': '#3e7c4f', // forest green
  'accent-info': '#3b6ea5', // royal blue
  danger: '#a83232', // dragon red
  'accent-achievement': '#7a4fbf', // royal purple
};

/**
 * NPC skin: not a ThemePack — the fixed palette for all (parent) routes
 * regardless of any kid's theme choice. Dark RPG-neutral (deep indigo with
 * purple/cyan/gold accents), matching the app's welcome-screen design
 * language; adult in tone, but never plain.
 */
export const npcNeutralPalette: Palette = {
  'bg-base': '#07061a', // deep indigo night
  surface: '#13102f', // card
  'surface-raised': '#1c1844', // elevated card
  border: '#262150', // hairline on dark indigo
  'text-primary': '#f0eeff',
  'text-muted': '#8d83bd',
  'text-inverse': '#ffffff',
  'accent-loot': '#f5a623', // gold
  'accent-progress': '#10b981',
  'accent-info': '#8b5cf6', // royal purple (primary actions)
  danger: '#ef4444',
  'accent-achievement': '#22d3ee', // cyan
};

/** Modal backdrop scrim — the one sanctioned non-token color. */
export const SCRIM_COLOR = 'rgba(0, 0, 0, 0.5)';

export const cssVarName = (token: ThemeToken) => `--color-${token}`;

/**
 * Builds a NativeWind v4 CSS-variable override style for a palette. The
 * ThemeProvider applies the result to its wrapping View, which switches the
 * active palette at runtime for the whole subtree.
 */
export const themeVars = (palette: Palette) =>
  vars(Object.fromEntries(themeTokens.map((token) => [cssVarName(token), palette[token]])));
