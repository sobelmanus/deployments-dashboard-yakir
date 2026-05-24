import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg:                'var(--color-bg)',
        surface:           'var(--color-surface)',
        'surface-alt':     'var(--color-surface-alt)',
        'surface-hover':   'var(--color-surface-hover)',
        'surface-raised':  'var(--color-surface-raised)',
        border:            'var(--color-border)',
        'border-light':    'var(--color-border-light)',
        'text-primary':    'var(--color-text-primary)',
        'text-secondary':  'var(--color-text-secondary)',
        'text-muted':      'var(--color-text-muted)',
      },
    },
  },
  plugins: [],
}
export default config
