interface DividerProps {
  className?: string;
  orientation?: 'horizontal' | 'vertical';
  variant?: 'solid' | 'dashed' | 'dotted';
  color?: 'light' | 'main' | 'dark';
  spacing?: 'none' | 'sm' | 'md' | 'lg';
}

export function Divider({
  className = '',
  orientation = 'horizontal',
  variant = 'solid',
  color = 'main',
  spacing = 'md',
}: DividerProps) {
  const baseStyles = 'shrink-0';
  
  const orientationStyles = {
    horizontal: 'w-full border-0 border-t',
    vertical: 'h-full border-0 border-r',
  };

  const variantStyles = {
    solid: 'border-solid',
    dashed: 'border-dashed',
    dotted: 'border-dotted',
  };

  const colorStyles = {
    light: 'border-border-light',
    main: 'border-border-main',
    dark: 'border-border-dark',
  };

  const spacingStyles = {
    none: '',
    sm: orientation === 'horizontal' ? 'my-2' : 'mx-2',   // 8px
    md: orientation === 'horizontal' ? 'my-4' : 'mx-4',   // 16px
    lg: orientation === 'horizontal' ? 'my-6' : 'mx-6',   // 24px
  };

  return (
    <hr 
      className={`
        ${baseStyles}
        ${orientationStyles[orientation]}
        ${variantStyles[variant]}
        ${colorStyles[color]}
        ${spacingStyles[spacing]}
        ${className}
      `}
      role="separator"
      aria-orientation={orientation}
    />
  );
}

// Example usage:
// <Divider />  // Default horizontal divider
// 
// <Flex direction="row">
//   <div>תוכן ימני</div>
//   <Divider orientation="vertical" spacing="md" />
//   <div>תוכן שמאלי</div>
// </Flex>
// 
// <div>
//   <h2>כותרת</h2>
//   <Divider variant="dashed" color="light" spacing="lg" />
//   <p>תוכן</p>
// </div> 