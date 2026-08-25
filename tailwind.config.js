/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#0A0A0A',
        surface: {
          lowest: '#0E0E0E',
          low: '#131313',
          DEFAULT: '#161615',
          high: '#1C1B1B',
          higher: '#201F1F',
          highest: '#2A2A2A',
        },
        border: {
          DEFAULT: '#232323',
          subtle: '#1C1B1B',
        },
        primary: {
          DEFAULT: '#FFD485',
          container: '#F5B300',
          onContainer: '#412D00',
        },
        onSurface: '#E5E2E1',
        onSurfaceVariant: '#D4C4AC',
        outline: '#9D8F78',
        success: '#22C55E',
        error: '#EF4444',
        warning: '#F59E0B',
        info: '#3B82F6',
        purple: '#A855F7',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        sm: '4px',
        DEFAULT: '8px',
        md: '12px',
        lg: '16px',
        xl: '24px',
      },
    },
  },
  plugins: [],
};
