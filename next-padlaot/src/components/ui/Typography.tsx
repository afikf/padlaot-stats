'use client';

import { ReactNode } from 'react';
import { type FontSize, type FontWeight } from '@/styles/theme/typography';

interface TypographyProps {
  variant?: FontSize;
  weight?: FontWeight;
  children: ReactNode;
  className?: string;
}

const variantClasses: Record<FontSize, string> = {
  xs: 'text-xs',
  sm: 'text-sm',
  base: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
  h1: 'text-4xl font-bold',
  h2: 'text-3xl font-bold',
  h3: 'text-2xl font-bold',
  h4: 'text-xl font-bold',
  h5: 'text-lg font-bold',
  h6: 'text-base font-bold'
};

const weightClasses: Record<FontWeight, string> = {
  thin: 'font-thin',
  light: 'font-light',
  normal: 'font-normal',
  medium: 'font-medium',
  semibold: 'font-semibold',
  bold: 'font-bold',
  extrabold: 'font-extrabold'
};

export function Typography({
  variant = 'base',
  weight = 'normal',
  children,
  className = '',
}: TypographyProps) {
  const classes = [
    variantClasses[variant],
    // Only add weight class if not using a heading variant (h1-h6)
    !variant.startsWith('h') && weightClasses[weight],
    className
  ].filter(Boolean).join(' ');

  // Map variant to HTML element
  const getElement = () => {
    switch (variant) {
      case 'h1': return 'h1';
      case 'h2': return 'h2';
      case 'h3': return 'h3';
      case 'h4': return 'h4';
      case 'h5': return 'h5';
      case 'h6': return 'h6';
      default: return 'p';
    }
  };

  const Element = getElement();

  return (
    <Element className={classes}>
      {children}
    </Element>
  );
}

// Example usage:
// <Typography variant="h1">כותרת ראשית</Typography>
// <Typography variant="base">טקסט רגיל</Typography>
// <Typography variant="sm" weight="medium">טקסט קטן</Typography>
// <Typography className="ltr-nums">12345</Typography> 