import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { blendMixboxColors, hexToRgb, rgbToHex } from './color-blender';
import { renderGearToCanvas } from './canvas-renderer';
import { ATM11_CATALOG } from '@/data/defaultCatalog';
import { GearBuild } from '@/types/silentgear';

describe('color-blender - Mixbox Latent Pigment Blending (Issue #31)', () => {
  it('converte hex para RGB e RGB para hex corretamente', () => {
    expect(hexToRgb('#D152E3')).toEqual([209, 82, 227]);
    expect(hexToRgb('#0B2037')).toEqual([11, 32, 55]);
    expect(hexToRgb('FFF')).toEqual([255, 255, 255]);
    expect(rgbToHex([79, 70, 184])).toBe('#4F46B8');
  });

  it('retorna a própria cor quando apenas um material está presente', () => {
    const singleColor = hexToRgb('#D152E3');
    const result = blendMixboxColors([singleColor]);
    expect(result).toEqual(singleColor);
  });

  it('retorna branco quando a lista de cores está vazia', () => {
    expect(blendMixboxColors([])).toEqual([255, 255, 255]);
  });

  it('mistura Unobtainium (#D152E3) e Uru Metal (#0B2037) atingindo a cor exata do jogo #4F46B8 (diferença <= 8 por canal)', () => {
    const unobtainium = hexToRgb('#D152E3');
    const uruMetal = hexToRgb('#0B2037');

    const blended = blendMixboxColors([unobtainium, uruMetal]);
    const hex = rgbToHex(blended);

    // No jogo (ColorUtils.blendMixbox): #4F46B8 -> [79, 70, 184]
    const expectedRgb = hexToRgb('#4F46B8');

    const diffR = Math.abs(blended[0] - expectedRgb[0]);
    const diffG = Math.abs(blended[1] - expectedRgb[1]);
    const diffB = Math.abs(blended[2] - expectedRgb[2]);

    expect(diffR, 'Canal R deve estar a <= 8 do jogo').toBeLessThanOrEqual(8);
    expect(diffG, 'Canal G deve estar a <= 8 do jogo').toBeLessThanOrEqual(8);
    expect(diffB, 'Canal B deve estar a <= 8 do jogo').toBeLessThanOrEqual(8);

    expect(hex).toBe('#4F46B8');
  });

  it('mistura a liga de cinco metais atingindo a cor exata do jogo #747F72 (diferença <= 8 por canal)', () => {
    // 5 metais do save de referência ATM11:
    // Tyrian Steel (#B01080), Unobtainium (#D152E3), Uru Metal (#0B2037), Vibranium (#26DE88), Allthemodium (#FFEF0E)
    const fiveMetals = [
      '#B01080',
      '#D152E3',
      '#0B2037',
      '#26DE88',
      '#FFEF0E',
    ].map(hexToRgb);

    const blended = blendMixboxColors(fiveMetals);
    const hex = rgbToHex(blended);

    // No jogo (ColorUtils.blendMixbox): #747F72 -> [116, 127, 114]
    const expectedRgb = hexToRgb('#747F72');

    const diffR = Math.abs(blended[0] - expectedRgb[0]);
    const diffG = Math.abs(blended[1] - expectedRgb[1]);
    const diffB = Math.abs(blended[2] - expectedRgb[2]);

    expect(diffR, 'Canal R deve estar a <= 8 do jogo').toBeLessThanOrEqual(8);
    expect(diffG, 'Canal G deve estar a <= 8 do jogo').toBeLessThanOrEqual(8);
    expect(diffB, 'Canal B deve estar a <= 8 do jogo').toBeLessThanOrEqual(8);

    expect(hex).toBe('#747F72');
  });

  it('registra a decisão de licença do Mixbox (CC BY-NC 4.0) no README.md', () => {
    const readmePath = path.resolve(__dirname, '../../README.md');
    const content = fs.readFileSync(readmePath, 'utf-8');

    expect(content).toContain('Mixbox');
    expect(content).toContain('CC BY-NC 4.0');
    expect(content).toContain('Secret Weapons');
  });

  it('renderGearToCanvas renderiza espada com liga composta usando a nova cor Mixbox', () => {
    const build: GearBuild = {
      gearTypeId: 'sword',
      parts: {
        main: {
          materialId: 'silentgear:unobtainium',
          materials: [
            { materialId: 'silentgear:unobtainium' },
            { materialId: 'sgearmetalworks:uru_metal' },
          ],
        },
        rod: { materialId: 'silentgear:wood' },
      },
    };

    let capturedFillStyles: string[] = [];
    const canvas = {
      width: 128,
      height: 128,
      getContext: () => ({
        imageSmoothingEnabled: false,
        clearRect: () => {},
        fillRect: () => {},
        set fillStyle(val: string) {
          capturedFillStyles.push(val);
        },
        get fillStyle() {
          return '';
        },
      }),
    } as unknown as HTMLCanvasElement;

    renderGearToCanvas(canvas, build, ATM11_CATALOG, { size: 128 });

    // A cor base da lâmina (main) para Unobtainium + Uru Metal agora é #4F46B8 (rgb 79, 70, 184)
    // O shader multiplica os shades (ex: shade 255 dá rgb(79, 70, 184))
    const hasMixboxColor = capturedFillStyles.some((style) => style === 'rgb(79, 70, 184)');
    expect(hasMixboxColor, 'Deve conter pixel tingido com a cor pura da liga (#4F46B8)').toBe(true);
  });
});
