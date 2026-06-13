import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';

import type { ThemePack, ThemeSoundKey } from '../types/theme';

/**
 * Fire-and-forget themed SFX via expo-audio (the SDK 54 replacement for the
 * deprecated expo-av). Sources come exclusively from the active pack's sound
 * manifest (silent placeholder .wav files until real audio lands).
 *
 * Sound is garnish: every path here swallows errors so a missing codec or a
 * muted simulator can never break the game loop.
 */

let audioModeConfigured = false;

export const playPackSound = (pack: ThemePack, key: ThemeSoundKey): void => {
  try {
    if (!audioModeConfigured) {
      audioModeConfigured = true;
      // Kids' phones live on silent: short reward SFX should still play.
      void setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
    }
    const player = createAudioPlayer(pack.sounds[key]);
    player.play();
    // Placeholder clips are < 2s; release the native player afterwards.
    setTimeout(() => {
      try {
        player.remove();
      } catch {
        // already released
      }
    }, 4000);
  } catch {
    // never let audio failures surface to the UI
  }
};
