import type { Config } from 'tailwindcss';
import { colors } from './src/styles/theme/colors';
import { typography } from './src/styles/theme/typography';
import { spacing } from './src/styles/theme/spacing';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    colors: {
      ...colors.primary,
      ...colors.semantic,
      ...colors.neutral,
      bg: colors.background,
      text: colors.text,
      border: colors.border,
    },
    fontFamily: typography.fontFamily,
    fontSize: typography.fontSize,
    fontWeight: typography.fontWeight,
    letterSpacing: typography.letterSpacing,
    spacing: {
      ...spacing,
      // Add percentage-based spacing for flex layouts
      '1/2': '50%',
      '1/3': '33.333333%',
      '2/3': '66.666667%',
      '1/4': '25%',
      '3/4': '75%',
      'full': '100%',
    },
    extend: {
      // Component-specific spacing
      height: {
        'touch-min': spacing.touch.min,
        'touch-comfortable': spacing.touch.comfortable,
        'touch-large': spacing.touch.large,
        'nav-mobile': spacing.component.nav.height.mobile,
        'nav-desktop': spacing.component.nav.height.desktop,
      },
      padding: {
        'container-mobile': spacing.layout.container.padding.mobile,
        'container-tablet': spacing.layout.container.padding.tablet,
        'container-desktop': spacing.layout.container.padding.desktop,
      },
      gap: {
        'grid-mobile': spacing.layout.grid.gap.mobile,
        'grid-tablet': spacing.layout.grid.gap.tablet,
        'grid-desktop': spacing.layout.grid.gap.desktop,
      },
      maxWidth: {
        ...spacing.layout.container.maxWidth,
      },
    },
  },
  plugins: [],
};

export default config; 