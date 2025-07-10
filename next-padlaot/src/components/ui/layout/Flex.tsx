import { ReactNode } from 'react';

interface FlexProps {
  children: ReactNode;
  className?: string;
  direction?: 'row' | 'row-reverse' | 'col' | 'col-reverse';
  align?: 'start' | 'center' | 'end' | 'stretch' | 'baseline';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
  wrap?: boolean;
  gap?: 'none' | 'sm' | 'md' | 'lg';
  inline?: boolean;
}

export function Flex({
  children,
  className = '',
  direction = 'row',
  align = 'start',
  justify = 'start',
  wrap = false,
  gap = 'none',
  inline = false,
}: FlexProps) {
  const baseStyles = inline ? 'inline-flex' : 'flex';
  
  const directionStyles = {
    row: 'flex-row',
    'row-reverse': 'flex-row-reverse',
    col: 'flex-col',
    'col-reverse': 'flex-col-reverse',
  };

  const alignStyles = {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end',
    stretch: 'items-stretch',
    baseline: 'items-baseline',
  };

  const justifyStyles = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    between: 'justify-between',
    around: 'justify-around',
    evenly: 'justify-evenly',
  };

  const gapStyles = {
    none: '',
    sm: 'gap-2 md:gap-3',    // 8px -> 12px
    md: 'gap-4 md:gap-5',    // 16px -> 20px
    lg: 'gap-6 md:gap-8',    // 24px -> 32px
  };

  return (
    <div 
      className={`
        ${baseStyles}
        ${directionStyles[direction]}
        ${alignStyles[align]}
        ${justifyStyles[justify]}
        ${wrap ? 'flex-wrap' : 'flex-nowrap'}
        ${gapStyles[gap]}
        ${className}
      `}
    >
      {children}
    </div>
  );
}

// Example usage:
// <Flex direction="row" align="center" justify="between" gap="md">
//   <div>פריט ימני</div>
//   <div>פריט שמאלי</div>
// </Flex>

// Common patterns:
// Center both axes:
// <Flex align="center" justify="center">
//   <div>תוכן ממורכז</div>
// </Flex>

// Vertical stack:
// <Flex direction="col" gap="md">
//   <div>פריט 1</div>
//   <div>פריט 2</div>
// </Flex>

// Space between:
// <Flex justify="between" align="center">
//   <div>שמאל</div>
//   <div>ימין</div>
// </Flex> 