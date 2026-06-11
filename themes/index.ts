import { baseLexicon, highFantasy } from './high-fantasy';
import { retroGaming } from './retro-gaming';
import { sciFi } from './sci-fi';
import type { ThemePack } from '../types/theme';

export { baseLexicon };
export type { AssetManifest, SoundManifest, StyleVariant, ThemePack } from '../types/theme';

export const themePacks = {
  'high-fantasy': highFantasy,
  'sci-fi': sciFi,
  'retro-gaming': retroGaming,
} as const satisfies Record<string, ThemePack>;

export type ThemeId = keyof typeof themePacks;

/** Free pack; also the fallback when a stored theme_id is unknown or locked. */
export const DEFAULT_THEME_ID: ThemeId = 'high-fantasy';

export const getThemePack = (themeId: string): ThemePack =>
  themePacks[themeId as ThemeId] ?? themePacks[DEFAULT_THEME_ID];

export const getVariant = (pack: ThemePack, variantId: string | null | undefined) =>
  pack.variants.find((variant) => variant.id === variantId) ?? null;
