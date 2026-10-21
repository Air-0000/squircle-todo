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
          border: withOpacity('--border-subtle'),
        }
      },
      boxShadow: {
        'squircle': 'var(--shadow-squircle)',
        'squircle-sm': '0 2px 8px -2px rgba(0, 0, 0, 0.08)',
        'squircle-lg': '0 12px 32px -6px rgba(0, 0, 0, 0.16)',
      },
      transitionTimingFunction: {
        'spring-smooth': 'cubic-bezier(0.175, 0.885, 0.32, 1.1)',
        'spring-bouncy': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      }
    },
  },
  plugins: [],
}
