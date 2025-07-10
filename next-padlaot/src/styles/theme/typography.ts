export const typography = {
  // Font families
  fontFamily: {
    primary: ['Assistant', 'system-ui', 'sans-serif'],
    // For numbers and Latin characters
    numeric: ['Assistant', 'Arial', 'sans-serif'],
  },

  // Font sizes (mobile-first)
  fontSize: {
    // Body text
    xs: ['0.75rem', { lineHeight: '1rem' }],     // 12px
    sm: ['0.875rem', { lineHeight: '1.25rem' }], // 14px
    base: ['1rem', { lineHeight: '1.5rem' }],    // 16px
    lg: ['1.125rem', { lineHeight: '1.75rem' }], // 18px
    xl: ['1.25rem', { lineHeight: '1.75rem' }],  // 20px

    // Headings
    h1: ['1.875rem', { lineHeight: '2.25rem' }], // 30px
    h2: ['1.5rem', { lineHeight: '2rem' }],      // 24px
    h3: ['1.25rem', { lineHeight: '1.75rem' }],  // 20px
    h4: ['1.125rem', { lineHeight: '1.5rem' }],  // 18px
    h5: ['1rem', { lineHeight: '1.5rem' }],      // 16px
    h6: ['0.875rem', { lineHeight: '1.25rem' }], // 14px
  },

  // Font weights
  fontWeight: {
    thin: '200',
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
  },

  // Letter spacing (adjusted for Hebrew)
  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0em',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
  },
} as const;

// Helper types
export type FontFamily = keyof typeof typography.fontFamily;
export type FontSize = keyof typeof typography.fontSize;
export type FontWeight = keyof typeof typography.fontWeight;
export type LetterSpacing = keyof typeof typography.letterSpacing; 