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
          bg: '#0f1115',
          surface: '#181b22',
          surfaceHover: '#232732',
          card: '#1c202a',
          border: '#2e3544',
          borderHover: '#444d62',
          primary: '#06b6d4',
          primaryHover: '#0891b2',
          accent: '#10b981',
          crimson: '#f43f5e',
          gold: '#f59e0b',
          muted: '#8b949e',
          text: '#f0f6fc',
        },
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'mc-inset': 'inset 2px 2px 0px rgba(255,255,255,0.06), inset -2px -2px 0px rgba(0,0,0,0.5)',
        'mc-box': '2px 2px 0px rgba(0,0,0,0.4)',
      },
    },
  },
  plugins: [],
};

export default config;
