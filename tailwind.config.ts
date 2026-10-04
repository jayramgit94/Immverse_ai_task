import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        canvas: {
          DEFAULT: '#FBFBFA',
          subtle: '#F7F7F5',
          muted: '#F1F1EF',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          hover: '#F9F9F8',
          active: '#F4F4F2',
        },
        border: {
          DEFAULT: '#E5E5E3',
          subtle: '#ECECEE',
          strong: '#D4D4D1',
        },
        ink: {
          primary: '#191919',
          secondary: '#6B7280',
          tertiary: '#9CA3AF',
          faint: '#D1D5DB',
        },
        accent: {
          DEFAULT: '#18181B',
          hover: '#27272A',
          foreground: '#FFFFFF',
        },
        blocker: {
          DEFAULT: '#BE123C',
          subtle: '#FFF1F2',
          border: '#FECDD3',
        },
        warning: {
          DEFAULT: '#B45309',
          subtle: '#FFFBEB',
          border: '#FDE68A',
        },
        success: {
          DEFAULT: '#047857',
          subtle: '#F0FDF4',
          border: '#BBF7D0',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'sans-serif',
        ],
        mono: [
          '"JetBrains Mono"',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          'monospace',
        ],
      },
      boxShadow: {
        subtle: '0 1px 2px 0 rgba(0, 0, 0, 0.04)',
        popup: '0 4px 16px -2px rgba(0, 0, 0, 0.08), 0 2px 6px -1px rgba(0, 0, 0, 0.04)',
        modal: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      },
      borderRadius: {
        sm: '4px',
        DEFAULT: '6px',
        md: '6px',
        lg: '8px',
      },
    },
  },
  plugins: [],
};

export default config;
