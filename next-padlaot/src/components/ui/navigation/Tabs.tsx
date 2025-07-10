'use client';

import { useState, useEffect } from 'react';
import { TabItem } from '@/types/navigation';
import { Flex } from '../layout/Flex';

interface TabsProps {
  items: TabItem[];
  value?: string;
  onChange: (value: string) => void;
  className?: string;
  variant?: 'filled' | 'outlined';
  fullWidth?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function Tabs({
  items,
  value,
  onChange,
  className = '',
  variant = 'filled',
  fullWidth = false,
  size = 'md',
}: TabsProps) {
  // If no value is provided, use the first non-disabled tab
  const [activeTab, setActiveTab] = useState(
    value || items.find(item => !item.disabled)?.value || items[0]?.value
  );

  // Update active tab when value prop changes
  useEffect(() => {
    if (value) {
      setActiveTab(value);
    }
  }, [value]);

  const handleTabClick = (tabValue: string) => {
    setActiveTab(tabValue);
    onChange(tabValue);
  };

  const baseStyles = 'relative transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2';
  
  const variantStyles = {
    filled: {
      container: 'bg-neutral-100 p-1 rounded-lg',
      tab: {
        active: 'bg-white text-primary-700 shadow-sm',
        inactive: 'text-neutral-600 hover:text-neutral-900',
      },
    },
    outlined: {
      container: 'border-b border-border-main',
      tab: {
        active: 'text-primary-700 border-b-2 border-primary-500',
        inactive: 'text-neutral-600 hover:text-neutral-900 hover:border-b-2 hover:border-neutral-300',
      },
    },
  };

  const sizeStyles = {
    sm: 'text-sm px-3 py-1.5',
    md: 'text-base px-4 py-2',
    lg: 'text-lg px-6 py-2.5',
  };

  return (
    <div 
      role="tablist"
      className={`
        ${variantStyles[variant].container}
        ${className}
        flex
      `}
    >
      {items.map((item) => {
        const isActive = item.value === activeTab;
        const isDisabled = item.disabled;

        return (
          <button
            key={item.value}
            role="tab"
            aria-selected={isActive}
            aria-disabled={isDisabled}
            disabled={isDisabled}
            onClick={() => !isDisabled && handleTabClick(item.value)}
            className={`
              ${baseStyles}
              ${sizeStyles[size]}
              ${isActive 
                ? variantStyles[variant].tab.active 
                : variantStyles[variant].tab.inactive
              }
              ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              ${fullWidth ? 'flex-1' : ''}
              rounded-md
            `}
          >
            <Flex align="center" justify="center" gap="sm">
              {item.icon && (
                <item.icon className={`
                  ${size === 'sm' ? 'h-4 w-4' : ''}
                  ${size === 'md' ? 'h-5 w-5' : ''}
                  ${size === 'lg' ? 'h-6 w-6' : ''}
                `} />
              )}
              {item.label}
            </Flex>
          </button>
        );
      })}
    </div>
  );
}

// Example usage:
// const tabs: TabItem[] = [
//   { label: 'פרטים', value: 'details' },
//   { label: 'סטטיסטיקות', value: 'stats', icon: ChartBarIcon },
//   { label: 'הגדרות', value: 'settings', disabled: true },
// ];
//
// <Tabs
//   items={tabs}
//   value="details"
//   onChange={(value) => console.log(value)}
//   variant="filled"
//   size="md"
// /> 