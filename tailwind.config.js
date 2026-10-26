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
        'squircle-sm': '10px',
        'squircle': '14px',
        'squircle-md': '18px',
        'squircle-lg': '22px',
        'squircle-xl': '28px',
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
          'accent-subtle': withOpacity('--accent-subtle'),
          'accent-contrast': withOpacity('--accent-contrast'),
          border: withOpacity('--border-subtle'),
        }
      },
      // iOS-like type scale, tuned for Chinese text on ~390px-wide phones.
      fontSize: {
        'caption2': ['11px', '14px'],
        'caption': ['12px', '16px'],
        'footnote': ['13px', '18px'],
        'callout': ['14px', '20px'],
        'body': ['15px', '22px'],
        'headline': ['17px', '24px'],
        'title3': ['20px', '26px'],
        'title2': ['22px', '28px'],
        'title1': ['28px', '34px'],
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
