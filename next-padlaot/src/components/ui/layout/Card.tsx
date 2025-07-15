import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  variant?: 'elevated' | 'outlined' | 'flat';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

export function Card({
  children,
  className = '',
  variant = 'elevated',
  padding = 'md',
  onClick,
}: CardProps) {
  const baseStyles = 'rounded-xl transition-all duration-200';
  
  const variantStyles = {
    elevated: 'bg-white shadow-md hover:shadow-lg border border-primary-200',
    outlined: 'bg-white border-2 border-primary-200 hover:border-primary-300',
    flat: 'bg-primary-50',
  };

  const paddingStyles = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  return (
    <div 
      className={`
        ${baseStyles}
        ${variantStyles[variant]}
        ${paddingStyles[padding]}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {children}
    </div>
  );
}

// Example usage:
// <Card variant="elevated" padding="md">
//   <h3>כותרת הכרטיס</h3>
//   <p>תוכן הכרטיס</p>
// </Card> 