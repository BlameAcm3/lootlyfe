// Static asset modules (Metro resolves these to bundled asset ids).
declare module '*.png' {
  const asset: number;
  export default asset;
}

declare module '*.wav' {
  const asset: number;
  export default asset;
}
