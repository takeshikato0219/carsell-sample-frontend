import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ["class"],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Material Design カラーパレット
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Google グレースケール
        'google-gray': {
          50: '#f8f9fa',
          100: '#f1f3f4',
          200: '#e8eaed',
          300: '#dadce0',
          400: '#bdc1c6',
          500: '#9aa0a6',
          600: '#80868b',
          700: '#5f6368',
          800: '#3c4043',
          900: '#202124',
        },
        // Google Blue
        'google-blue': {
          50: '#e8f0fe',
          100: '#d2e3fc',
          200: '#aecbfa',
          300: '#8ab4f8',
          400: '#669df6',
          500: '#4285f4',
          600: '#1a73e8',
          700: '#1967d2',
          800: '#185abc',
          900: '#174ea6',
        },
        // Google Green
        'google-green': {
          50: '#e6f4ea',
          100: '#ceead6',
          200: '#a8dab5',
          300: '#81c995',
          400: '#5bb974',
          500: '#34a853',
          600: '#1e8e3e',
          700: '#188038',
          800: '#137333',
          900: '#0d652d',
        },
        // Google Yellow
        'google-yellow': {
          50: '#fef7e0',
          100: '#feefc3',
          200: '#fde293',
          300: '#fdd663',
          400: '#fcc934',
          500: '#fbbc04',
          600: '#f9ab00',
          700: '#f29900',
          800: '#ea8600',
          900: '#e37400',
        },
        // Google Red
        'google-red': {
          50: '#fce8e6',
          100: '#fad2cf',
          200: '#f6aea9',
          300: '#f28b82',
          400: '#ee675c',
          500: '#ea4335',
          600: '#d93025',
          700: '#c5221f',
          800: '#b31412',
          900: '#a50e0e',
        },
      },
      // Material Design ボーダーラジウス
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        'md-sm': '4px',
        'md-lg': '12px',
        'md-xl': '16px',
        'md-2xl': '24px',
        'md-full': '28px',
      },
      // Material Design フォント (Noto Sans JP / Roboto)
      fontFamily: {
        'google': ['Noto Sans JP', 'Roboto', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Arial', 'sans-serif'],
        'noto': ['Noto Sans JP', 'Roboto', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Arial', 'sans-serif'],
        'roboto': ['Roboto', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Arial', 'sans-serif'],
        'roboto-mono': ['Roboto Mono', 'Monaco', 'Menlo', 'monospace'],
      },
      // Material Design エレベーション (シャドウ)
      boxShadow: {
        'md-1': '0 1px 2px 0 rgba(60, 64, 67, 0.3), 0 1px 3px 1px rgba(60, 64, 67, 0.15)',
        'md-2': '0 1px 2px 0 rgba(60, 64, 67, 0.3), 0 2px 6px 2px rgba(60, 64, 67, 0.15)',
        'md-3': '0 1px 3px 0 rgba(60, 64, 67, 0.3), 0 4px 8px 3px rgba(60, 64, 67, 0.15)',
        'md-4': '0 2px 3px 0 rgba(60, 64, 67, 0.3), 0 6px 10px 4px rgba(60, 64, 67, 0.15)',
        'md-5': '0 4px 4px 0 rgba(60, 64, 67, 0.3), 0 8px 12px 6px rgba(60, 64, 67, 0.15)',
      },
      // Material Design トランジション
      transitionTimingFunction: {
        'md-standard': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'md-decelerate': 'cubic-bezier(0, 0, 0.2, 1)',
        'md-accelerate': 'cubic-bezier(0.4, 0, 1, 1)',
      },
      // Material Design トランジション時間
      transitionDuration: {
        'md-short': '100ms',
        'md-medium': '250ms',
        'md-long': '400ms',
      },
      // Material Design スペーシング
      spacing: {
        'md-xs': '4px',
        'md-sm': '8px',
        'md-md': '16px',
        'md-lg': '24px',
        'md-xl': '32px',
        'md-2xl': '48px',
        'md-3xl': '64px',
      },
      // Material Design フォントサイズ
      fontSize: {
        'md-display-large': ['57px', { lineHeight: '64px', fontWeight: '400', letterSpacing: '-0.25px' }],
        'md-display-medium': ['45px', { lineHeight: '52px', fontWeight: '400' }],
        'md-display-small': ['36px', { lineHeight: '44px', fontWeight: '400' }],
        'md-headline-large': ['32px', { lineHeight: '40px', fontWeight: '400' }],
        'md-headline-medium': ['28px', { lineHeight: '36px', fontWeight: '400' }],
        'md-headline-small': ['24px', { lineHeight: '32px', fontWeight: '400' }],
        'md-title-large': ['22px', { lineHeight: '28px', fontWeight: '400' }],
        'md-title-medium': ['16px', { lineHeight: '24px', fontWeight: '500', letterSpacing: '0.15px' }],
        'md-title-small': ['14px', { lineHeight: '20px', fontWeight: '500', letterSpacing: '0.1px' }],
        'md-body-large': ['16px', { lineHeight: '24px', fontWeight: '400', letterSpacing: '0.5px' }],
        'md-body-medium': ['14px', { lineHeight: '20px', fontWeight: '400', letterSpacing: '0.25px' }],
        'md-body-small': ['12px', { lineHeight: '16px', fontWeight: '400', letterSpacing: '0.4px' }],
        'md-label-large': ['14px', { lineHeight: '20px', fontWeight: '500', letterSpacing: '0.1px' }],
        'md-label-medium': ['12px', { lineHeight: '16px', fontWeight: '500', letterSpacing: '0.5px' }],
        'md-label-small': ['11px', { lineHeight: '16px', fontWeight: '500', letterSpacing: '0.5px' }],
      },
    },
  },
  plugins: [],
}

export default config
