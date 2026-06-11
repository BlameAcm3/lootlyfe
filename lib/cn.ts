/** Joins NativeWind class fragments, dropping falsy values. */
export const cn = (...parts: Array<string | false | null | undefined>): string =>
  parts.filter(Boolean).join(' ');
