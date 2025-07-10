// Base unit: 4px
const BASE = 4;

export const spacing = {
  // Core spacing scale
  0: '0',
  px: '1px',
  0.5: `${BASE * 0.125}px`,  // 0.5px
  1: `${BASE * 0.25}px`,     // 1px
  1.5: `${BASE * 0.375}px`,  // 1.5px
  2: `${BASE * 0.5}px`,      // 2px
  2.5: `${BASE * 0.625}px`,  // 2.5px
  3: `${BASE * 0.75}px`,     // 3px
  3.5: `${BASE * 0.875}px`,  // 3.5px
  4: `${BASE}px`,            // 4px - base unit
  5: `${BASE * 1.25}px`,     // 5px
  6: `${BASE * 1.5}px`,      // 6px
  7: `${BASE * 1.75}px`,     // 7px
  8: `${BASE * 2}px`,        // 8px
  9: `${BASE * 2.25}px`,     // 9px
  10: `${BASE * 2.5}px`,     // 10px
  11: `${BASE * 2.75}px`,    // 11px
  12: `${BASE * 3}px`,       // 12px
  14: `${BASE * 3.5}px`,     // 14px
  16: `${BASE * 4}px`,       // 16px
  20: `${BASE * 5}px`,       // 20px
  24: `${BASE * 6}px`,       // 24px
  28: `${BASE * 7}px`,       // 28px
  32: `${BASE * 8}px`,       // 32px
  36: `${BASE * 9}px`,       // 36px
  40: `${BASE * 10}px`,      // 40px
  44: `${BASE * 11}px`,      // 44px - minimum touch target
  48: `${BASE * 12}px`,      // 48px - comfortable touch target
  52: `${BASE * 13}px`,      // 52px
  56: `${BASE * 14}px`,      // 56px
  60: `${BASE * 15}px`,      // 60px
  64: `${BASE * 16}px`,      // 64px
  72: `${BASE * 18}px`,      // 72px
  80: `${BASE * 20}px`,      // 80px
  96: `${BASE * 24}px`,      // 96px

  // Semantic spacing
  touch: {
    min: `${BASE * 11}px`,     // 44px - minimum touch target
    comfortable: `${BASE * 12}px`, // 48px - comfortable touch target
    large: `${BASE * 14}px`,    // 56px - large touch target
  },

  // Component-specific spacing
  component: {
    // Form elements
    input: {
      height: `${BASE * 11}px`,      // 44px
      padding: `${BASE * 3}px`,      // 12px
      gap: `${BASE * 2}px`,          // 8px
    },
    // Buttons
    button: {
      sm: `${BASE * 8}px`,           // 32px
      md: `${BASE * 11}px`,          // 44px
      lg: `${BASE * 12}px`,          // 48px
      padding: {
        x: `${BASE * 4}px`,          // 16px
        y: `${BASE * 2}px`,          // 8px
      }
    },
    // Cards
    card: {
      padding: {
        sm: `${BASE * 4}px`,         // 16px
        md: `${BASE * 5}px`,         // 20px
        lg: `${BASE * 6}px`,         // 24px
      },
      gap: `${BASE * 4}px`,          // 16px
    },
    // Navigation
    nav: {
      height: {
        mobile: `${BASE * 14}px`,    // 56px
        desktop: `${BASE * 16}px`,   // 64px
      },
      item: {
        gap: `${BASE * 2}px`,        // 8px
        padding: `${BASE * 3}px`,    // 12px
      }
    },
  },

  // Layout spacing
  layout: {
    container: {
      padding: {
        mobile: `${BASE * 4}px`,     // 16px
        tablet: `${BASE * 6}px`,     // 24px
        desktop: `${BASE * 8}px`,    // 32px
      },
      maxWidth: {
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
      },
    },
    section: {
      spacing: {
        mobile: `${BASE * 12}px`,    // 48px
        tablet: `${BASE * 16}px`,    // 64px
        desktop: `${BASE * 20}px`,   // 80px
      }
    },
    grid: {
      gap: {
        mobile: `${BASE * 4}px`,     // 16px
        tablet: `${BASE * 6}px`,     // 24px
        desktop: `${BASE * 8}px`,    // 32px
      }
    }
  }
} as const;

// Helper types
export type SpacingKey = keyof typeof spacing;
export type ComponentSpacing = keyof typeof spacing.component;
export type LayoutSpacing = keyof typeof spacing.layout; 