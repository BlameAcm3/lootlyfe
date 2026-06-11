/** Preset guild crests. The id is stored in guilds.crest. */
export type Crest = {
  id: string;
  emoji: string;
};

export const CRESTS: Crest[] = [
  { id: 'dragon', emoji: '🐉' },
  { id: 'castle', emoji: '🏰' },
  { id: 'shield', emoji: '🛡️' },
  { id: 'crown', emoji: '👑' },
  { id: 'phoenix', emoji: '🔥' },
  { id: 'owl', emoji: '🦉' },
];

export const getCrest = (id: string | null | undefined): Crest =>
  CRESTS.find((crest) => crest.id === id) ?? CRESTS[0];
