// Shared design coordinates; these are presentation values, never physics limits.
export const palette = Object.freeze({
  background: '#FFF8F0', sky: '#DDEFF7', lavender: '#BEB6E8',
  mint: '#BFE3D1', peach: '#FFD5BD', ink: '#394352',
  cream: '#F9E4C8', navy: '#354A68', white: '#FFFFFF', accent: '#CE9279',
});

export const layout = Object.freeze({
  width: 960, height: 540, groundY: 425,
  characterX: 270, characterY: 425, pixelsPerMeter: 40,
  characterHeight: 205, headHeight: 118, torsoHeight: 51, legHeight: 36,
});
