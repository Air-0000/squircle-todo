function withOpacity(variableName) {
  return ({ opacityValue }) => {
    if (opacityValue !== undefined) {
      return `color-mix(in srgb, var(${variableName}) calc(${opacityValue} * 100%), transparent)`;
    }
    return `var(${variableName})`;
  };
}

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      borderRadius: {
        'squircle-sm': '12px',
        'squircle': '16px',
        'squircle-md': '20px',
        'squircle-lg': '24px',
        'squircle-xl': '32px',
      },
      colors: {
        theme: {
          bg: withOpacity('--bg-primary'),
          card: withOpacity('--bg-card'),
          'card-subtle': withOpacity('--bg-card-subtle'),
          text: withOpacity('--text-primary'),
          'text-secondary': withOpacity('--text-secondary'),
          'text-muted': withOpacity('--text-muted'),
          accent: withOpacity('--accent-primary'),
          'accent-secondary': withOpacity('--accent-secondary'),
          'accent-subtle': withOpacity('--accent-subtle'),
          'accent-contrast': withOpacity('--accent-contrast'),
          border: withOpacity('--border-subtle'),
        }
      },
      spacing: {
        '4.5': '1.125rem',
        '8.5': '2.125rem',
      },
      boxShadow: {
        '2xs': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'squircle': 'var(--shadow-squircle)',
        'squircle-md': 'var(--shadow-squircle-md)',
        'squircle-lg': 'var(--shadow-squircle-lg)',
      },
    },
  },
  plugins: [],
}
