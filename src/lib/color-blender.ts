import mixbox from 'mixbox';

/**
 * Converte cor hexadecimal ('#RRGGBB' ou '#RGB') para tupla RGB [r, g, b].
 */
export function hexToRgb(hex: string): [number, number, number] {
  let cleanHex = hex.replace('#', '');
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map((c) => c + c).join('');
  }
  const num = parseInt(cleanHex, 16);
  if (Number.isNaN(num)) {
    return [255, 255, 255];
  }
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

/**
 * Converte tupla RGB [r, g, b] para formato hexadecimal '#RRGGBB'.
 */
export function rgbToHex(rgb: [number, number, number]): string {
  const [r, g, b] = rgb.map((c) =>
    Math.min(255, Math.max(0, Math.round(c)))
      .toString(16)
      .padStart(2, '0')
      .toUpperCase()
  );
  return `#${r}${g}${b}`;
}

/**
 * Mistura múltiplas cores RGB usando o algoritmo Mixbox (espaço latente de pigmentos Kubelka-Munk),
 * replicando exatamente ColorUtils.blendMixbox do SilentLib / Silent Gear oficial.
 */
export function blendMixboxColors(colors: Array<[number, number, number]>): [number, number, number] {
  if (colors.length === 0) return [255, 255, 255];
  if (colors.length === 1) return colors[0];

  const ratio = 1 / colors.length;
  const zList = colors.map((c) => mixbox.rgbToLatent(c));
  const zMix = new Array(mixbox.LATENT_SIZE).fill(0);

  for (let i = 0; i < mixbox.LATENT_SIZE; i++) {
    for (let c = 0; c < colors.length; c++) {
      zMix[i] += ratio * zList[c][i];
    }
  }

  const result = mixbox.latentToRgb(zMix);
  return [result[0], result[1], result[2]];
}
