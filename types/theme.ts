import type { ImageSourcePropType } from 'react-native';

import type { Palette } from '../constants/theme';
import type { Lexicon, PartialLexicon } from '../lib/lexicon';

/** Icon slots every pack provides art for. */
export type ThemeIconKey = 'quest' | 'loot' | 'gold' | 'streak';

/** Sound moments per AGENTS.md assets/sounds. */
export type ThemeSoundKey = 'quest_complete' | 'level_up' | 'gold_pickup' | 'loot_redeem';

/**
 * Static asset manifest. Values are bundled asset modules (require/import),
 * never path strings — Metro resolves them at build time, so nothing can 404.
 * Components resolve theme art ONLY through the manifest.
 */
export type AssetManifest = {
  icons: Record<ThemeIconKey, ImageSourcePropType>;
  avatarBases: ImageSourcePropType[];
};

export type SoundManifest = Record<ThemeSoundKey, number>;

/**
 * A style variant inside a theme pack: an alternate accent palette + avatar
 * set, optionally overriding lexicon entries. Variants serve all kids — there
 * are no gender modes.
 */
export type StyleVariant = {
  id: string;
  name: string;
  /** Token overrides merged over the pack palette. */
  palette: Partial<Palette>;
  /** Indices into the pack's avatarBases (which bases this variant offers). */
  avatarBases: number[];
  lexicon?: PartialLexicon;
};

export type ThemePack = {
  id: string;
  name: string;
  premium: boolean;
  /** Complete palette keyed to the generic token names in constants/theme.ts. */
  palette: Palette;
  /** Typography accents (display/heading fonts); fonts are bundled in a later pass. */
  typography: {
    headingFont: string;
    accentFont: string;
  };
  /**
   * User-facing terminology. The high-fantasy pack must be complete (it is
   * the end of the fallback chain); other packs should be complete too but
   * are typed partial so a missing key degrades to the base term instead of
   * crashing.
   */
  lexicon: PartialLexicon;
  assets: AssetManifest;
  sounds: SoundManifest;
  /** 2-3 style variants per pack. The first is the default. */
  variants: StyleVariant[];
};

/** The complete base lexicon contract (high-fantasy). */
export type BaseLexicon = Lexicon;
