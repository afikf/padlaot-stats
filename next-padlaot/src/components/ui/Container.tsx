'use client';

import { ReactNode } from 'react';

interface ContainerProps {
  children: ReactNode;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '7xl' | 'full';
}

export function Container({
  children,
  className = '',
  maxWidth = '7xl'
}: ContainerProps) {
  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '7xl': 'max-w-7xl',
    'full': 'max-w-full'
  };

  const classes = [
    'w-full',
    'px-4 sm:px-6 lg:px-8',
    'mx-auto',
    maxWidthClasses[maxWidth],
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={classes}>
      {children}
    </div>
  );
}

// Example usage:
// <Container>
//   <div className="gap-grid-mobile md:gap-grid-tablet lg:gap-grid-desktop">
//     Content with responsive spacing
//   </div>
// </Container> 