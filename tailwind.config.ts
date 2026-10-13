import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        mc: {
          bg: '#0E0F11',
          surface: '#16181B',
          surfaceHover: '#1E2125',
          card: '#1E2125',
          cardSubtle: '#0A0B0C',
          border: '#24272C',
          borderHover: '#30343A',
          primary: '#FF8A3D',
          primaryHover: '#FF9D5C',
          forge: '#FF8A3D',
          forgeHover: '#FF9D5C',
          forgeMuted: 'rgba(255, 138, 61, 0.15)',
          positive: '#4ADE80',
          positiveMuted: 'rgba(74, 222, 128, 0.14)',
          negative: '#F87171',
          negativeMuted: 'rgba(248, 113, 113, 0.14)',
          accent: '#4ADE80',
          crimson: '#F87171',
          gold: '#F2C94C',
          goldMuted: 'rgba(242, 201, 76, 0.14)',
          diamond: '#5CD6C7',
          muted: '#8B949E',
          mutedDark: '#4A4F57',
          mutedLight: '#A3A8B0',
          text: '#ECEDEF',
        },
      },
      fontFamily: {
        pixel: ['var(--font-pixel)', 'Pixelify Sans', 'monospace'],
        sans: ['var(--font-sans)', 'Geist', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['var(--font-mono)', 'Geist Mono', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        'mc-inset': 'inset 2px 2px 0px rgba(255,255,255,0.04), inset -2px -2px 0px rgba(0,0,0,0.5)',
        'mc-box': '2px 2px 0px rgba(0,0,0,0.4)',
        'forge-glow': '0 0 16px rgba(255, 138, 61, 0.25)',
      },
    },
  },
  plugins: [],
};

export default config;
