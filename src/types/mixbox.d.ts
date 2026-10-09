declare module 'mixbox' {
  export const LATENT_SIZE: number;
  export function rgbToLatent(rgb: [number, number, number] | number[]): number[];
  export function latentToRgb(latent: number[]): [number, number, number];
  export function lerp(rgb1: [number, number, number], rgb2: [number, number, number], t: number): [number, number, number];

  const mixbox: {
    LATENT_SIZE: number;
    rgbToLatent(rgb: [number, number, number] | number[]): number[];
    latentToRgb(latent: number[]): [number, number, number];
    lerp(rgb1: [number, number, number], rgb2: [number, number, number], t: number): [number, number, number];
  };

  export default mixbox;
}
