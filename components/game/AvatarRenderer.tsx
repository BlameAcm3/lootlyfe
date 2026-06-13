import { Image, View, type ImageSourcePropType } from 'react-native';

import { parseAvatarConfig } from '../../lib/avatar';
import { useTheme } from '../../hooks/useTheme';

type AvatarRendererProps = {
  /** adventurer_profiles.avatar_config jsonb, parsed defensively. */
  config: unknown;
  size: number;
};

/**
 * Composes the avatar from the active theme pack's asset manifest: base
 * character + one overlay per equipped slot, layered body → head → accessory.
 * Art resolves ONLY through the manifest, so every theme renders the same
 * avatar_config with its own look.
 */
export const AvatarRenderer = ({ config, size }: AvatarRendererProps) => {
  const { pack } = useTheme();
  const { base, slots } = parseAvatarConfig(config);

  const baseSource = pack.assets.avatarBases[base] ?? pack.assets.avatarBases[0];
  const layers: ImageSourcePropType[] = [baseSource];
  for (const slot of ['body', 'head', 'accessory'] as const) {
    const key = slots[slot];
    if (key) layers.push(pack.assets.cosmetics[key]);
  }

  // Dynamic runtime size → style exception list applies.
  return (
    <View style={{ width: size, height: size }}>
      {layers.map((source, index) => (
        <Image
          key={index}
          source={source}
          resizeMode="contain"
          style={{ position: 'absolute', width: size, height: size }}
        />
      ))}
    </View>
  );
};
