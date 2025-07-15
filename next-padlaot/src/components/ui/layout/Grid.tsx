import { ReactNode } from 'react';

type Cols = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

interface GridProps {
  children: ReactNode;
  className?: string;
  cols?: {
    mobile?: Cols;
    tablet?: Cols;
    desktop?: Cols;
  };
  gap?: 'none' | 'sm' | 'md' | 'lg';
  alignItems?: 'start' | 'center' | 'end' | 'stretch';
  justifyItems?: 'start' | 'center' | 'end' | 'stretch';
}

export function Grid({
  children,
  className = '',
  cols = {
    mobile: 1,    // Stack on mobile
    tablet: 2,    // 2 columns on tablet
    desktop: 3,   // 3 columns on desktop
  },
  gap = 'md',
  alignItems = 'stretch',
  justifyItems = 'stretch',
}: GridProps) {
  const baseStyles = 'grid w-full';
  
  const colStyles = {
    mobile: `grid-cols-${cols.mobile}`,
    tablet: cols.tablet ? `md:grid-cols-${cols.tablet}` : '',
    desktop: cols.desktop ? `lg:grid-cols-${cols.desktop}` : '',
  };

  const gapStyles = {
    none: '',
    sm: 'gap-grid-mobile md:gap-grid-tablet lg:gap-grid-desktop',
    md: 'gap-6 md:gap-8 lg:gap-10',  // 24px -> 32px -> 40px
    lg: 'gap-8 md:gap-10 lg:gap-12', // 32px -> 40px -> 48px
  };

  const alignmentStyles = {
    alignItems: `items-${alignItems}`,
    justifyItems: `justify-items-${justifyItems}`,
  };

  return (
    <div 
      className={`
        ${baseStyles}
        ${colStyles.mobile}
        ${colStyles.tablet}
        ${colStyles.desktop}
        ${gapStyles[gap]}
        ${alignmentStyles.alignItems}
        ${alignmentStyles.justifyItems}
        ${className}
      `}
    >
      {children}
    </div>
  );
}

// Example usage:
// <Grid
//   cols={{ mobile: 1, tablet: 2, desktop: 3 }}
//   gap="md"
//   alignItems="start"
// >
//   <Card>פריט 1</Card>
//   <Card>פריט 2</Card>
//   <Card>פריט 3</Card>
// </Grid> 