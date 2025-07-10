import { ReactNode } from 'react';

interface PaperProps {
  children: ReactNode;
  className?: string;
  elevation?: 0 | 1 | 2 | 3 | 4;
  rounded?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
}

export function Paper({
  children,
  className = '',
  elevation = 1,
  rounded = true,
  padding = 'md',
  hover = false,
}: PaperProps) {
  const baseStyles = 'bg-bg-primary transition-shadow';
  
  const elevationStyles = {
    0: '',
    1: 'shadow-sm',
    2: 'shadow',
    3: 'shadow-md',
    4: 'shadow-lg',
  };

  const hoverStyles = hover ? {
    0: 'hover:shadow-sm',
    1: 'hover:shadow',
    2: 'hover:shadow-md',
    3: 'hover:shadow-lg',
    4: 'hover:shadow-xl',
  } : {
    0: '',
    1: '',
    2: '',
    3: '',
    4: '',
  };

  const roundedStyles = rounded ? 'rounded-lg' : '';

  const paddingStyles = {
    none: '',
    sm: 'p-4',  // 16px from our spacing system
    md: 'p-5',  // 20px from our spacing system
    lg: 'p-6',  // 24px from our spacing system
  };

  return (
    <div 
      className={`
        ${baseStyles}
        ${elevationStyles[elevation]}
        ${hoverStyles[elevation]}
        ${roundedStyles}
        ${paddingStyles[padding]}
        ${className}
      `}
    >
      {children}
    </div>
  );
}

// Example usage:
// <Paper elevation={2} padding="lg" hover>
//   <h3>כותרת המסמך</h3>
//   <p>תוכן המסמך</p>
// </Paper>
//
// <Paper elevation={0} padding="none" rounded={false}>
//   <img src="..." alt="תמונה" />
// </Paper> 