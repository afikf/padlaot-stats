export const colors = {
  // Primary Blues
  primary: {
    50: '#EFF6FF',  // Lightest blue - backgrounds
    100: '#DBEAFE', // Very light blue
    200: '#BFDBFE', // Light blue - subtle highlights
    300: '#93C5FD', // Medium light blue
    400: '#60A5FA', // Medium blue
    500: '#3B82F6', // Main blue - primary actions
    600: '#2563EB', // Medium dark blue
    700: '#1D4ED8', // Dark blue - hover states
    800: '#1E40AF', // Very dark blue
    900: '#1E3A8A', // Darkest blue - text
  },

  // Semantic Colors
  semantic: {
    success: {
      light: '#D1FAE5',  // Light green
      main: '#059669',   // Main green
      dark: '#065F46',   // Dark green
    },
    error: {
      light: '#FEE2E2',  // Light red
      main: '#DC2626',   // Main red
      dark: '#991B1B',   // Dark red
    },
    warning: {
      light: '#FEF3C7',  // Light orange
      main: '#D97706',   // Main orange
      dark: '#92400E',   // Dark orange
    },
    info: {
      light: '#DBEAFE',  // Light blue
      main: '#3B82F6',   // Main blue
      dark: '#1E40AF',   // Dark blue
    }
  },

  // Neutral Colors
  neutral: {
    50: '#FAFAFA',   // Lightest - page background
    100: '#F4F4F5',  // Very light - card background
    200: '#E4E4E7',  // Light - borders
    300: '#D4D4D8',  // Medium light
    400: '#A1A1AA',  // Medium - disabled text
    500: '#71717A',  // Medium dark - secondary text
    600: '#52525B',  // Dark - body text
    700: '#3F3F46',  // Very dark - headings
    800: '#27272A',  // Almost black
    900: '#18181B',  // Black
  },

  // Special Use Colors
  background: {
    primary: '#FFFFFF',    // Main background
    secondary: '#F4F4F5',  // Secondary background
    tertiary: '#FAFAFA',   // Tertiary background
  },

  text: {
    primary: '#27272A',    // Main text color
    secondary: '#71717A',  // Secondary text
    disabled: '#A1A1AA',   // Disabled text
    inverse: '#FFFFFF',    // Text on dark backgrounds
  },

  border: {
    light: '#E4E4E7',      // Light borders
    main: '#D4D4D8',       // Main borders
    dark: '#A1A1AA',       // Dark borders
  },
} as const;

// Helper type for accessing colors with TypeScript
export type ColorKeys = keyof typeof colors;

// Helper functions for color manipulation
export const getColor = (path: string): string => {
  return path.split('.').reduce((obj, key) => obj[key], colors as any);
};

// Example usage:
// getColor('primary.500') => '#3B82F6'
// getColor('semantic.success.main') => '#059669' 