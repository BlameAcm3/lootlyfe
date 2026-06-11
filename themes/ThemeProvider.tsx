import { createContext, useContext, useMemo, type PropsWithChildren } from 'react';
import { View } from 'react-native';

import { npcNeutralPalette, themeVars, type Palette } from '../constants/theme';
import { makeTranslator, type LexiconKey, type LexiconVars } from '../lib/lexicon';
import {
  baseLexicon,
  DEFAULT_THEME_ID,
  getThemePack,
  getVariant,
  type StyleVariant,
  type ThemePack,
} from './index';

export type Translator = (key: LexiconKey, vars?: LexiconVars) => string;

type ThemeContextValue = {
  /** Pack id, or 'npc-neutral' when the NPC skin is active. */
  themeId: string;
  variantId: string | null;
  /** Resolved pack. The NPC skin borrows high-fantasy assets/sounds. */
  pack: ThemePack;
  variant: StyleVariant | null;
  /** The merged palette actually injected as CSS variables. */
  palette: Palette;
  isNpcSkin: boolean;
  t: Translator;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

type ThemeScopeProps = PropsWithChildren<{
  /** Ignored when npcSkin is true. */
  themeId?: string;
  variantId?: string | null;
  /** Clean neutral palette for all (parent)/NPC routes. */
  npcSkin?: boolean;
}>;

/**
 * Injects a theme pack's palette as NativeWind CSS variables for its subtree
 * and provides lexicon resolution. Scopes nest: the innermost palette wins,
 * which is how theme-lab previews several themes on one screen.
 *
 * Runtime switching = swapping the CSS variable values on this one wrapper
 * View; every `bg-*`/`text-*` token class below re-resolves automatically.
 */
export const ThemeScope = ({
  themeId = DEFAULT_THEME_ID,
  variantId = null,
  npcSkin = false,
  children,
}: ThemeScopeProps) => {
  const value = useMemo<ThemeContextValue>(() => {
    const pack = getThemePack(themeId);
    if (npcSkin) {
      return {
        themeId: 'npc-neutral',
        variantId: null,
        pack: getThemePack(DEFAULT_THEME_ID),
        variant: null,
        palette: npcNeutralPalette,
        isNpcSkin: true,
        // NPC copy uses the base domain terms (clear and adult).
        t: makeTranslator(baseLexicon),
      };
    }
    const variant = getVariant(pack, variantId);
    const palette = { ...pack.palette, ...variant?.palette };
    return {
      themeId: pack.id,
      variantId: variant?.id ?? null,
      pack,
      variant,
      palette,
      isNpcSkin: false,
      t: makeTranslator(baseLexicon, pack.lexicon, variant?.lexicon),
    };
  }, [themeId, variantId, npcSkin]);

  const varsStyle = useMemo(() => themeVars(value.palette), [value.palette]);

  return (
    <ThemeContext.Provider value={value}>
      <View style={[{ flex: 1 }, varsStyle]}>{children}</View>
    </ThemeContext.Provider>
  );
};

const fallbackValue: ThemeContextValue = {
  themeId: DEFAULT_THEME_ID,
  variantId: null,
  pack: getThemePack(DEFAULT_THEME_ID),
  variant: null,
  palette: getThemePack(DEFAULT_THEME_ID).palette,
  isNpcSkin: false,
  t: makeTranslator(baseLexicon),
};

/**
 * Active theme: merged palette (for runtime styles the className system can't
 * express — shadows, placeholderTextColor), pack assets/sounds, variant.
 */
export const useTheme = (): ThemeContextValue => useContext(ThemeContext) ?? fallbackValue;

/**
 * t(key, vars?) with typed LexiconKeys.
 * Fallback chain: variant lexicon → pack lexicon → high-fantasy base.
 */
export const useLexicon = (): { t: Translator } => {
  const { t } = useTheme();
  return { t };
};
