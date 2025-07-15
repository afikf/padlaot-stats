'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';
import { NavItem } from '@/types/navigation';
import { Flex } from '../layout/Flex';

interface NavbarProps {
  items: NavItem[];
  className?: string;
}

export function Navbar({ items, className = '' }: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const { userData } = useAuth();
  const userRole = userData?.role || 'user';

  // Filter items based on user role
  const filteredItems = items.filter(item => 
    !item.roles || item.roles.includes(userRole)
  );

  const isActiveLink = (href: string) => {
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <nav className={`bg-bg-primary shadow-sm ${className}`}>
      {/* Desktop Navigation */}
      <Flex 
        justify="between" 
        align="center" 
        className="h-nav-mobile lg:h-nav-desktop px-container-mobile md:px-container-tablet lg:px-container-desktop"
      >
        {/* Logo/Brand */}
        <Link href="/dashboard" className="text-primary-600 font-bold text-xl">
          פדלאות
        </Link>

        {/* Desktop Menu */}
        <ul className="hidden md:flex gap-4 items-start">
          {filteredItems.map((item) => (
            <li key={item.label}>
              <Link
                href={item.href}
                className={`
                  px-4 py-2 rounded-md transition-colors
                  ${isActiveLink(item.href)
                    ? 'bg-primary-50 text-primary-700'
                    : 'hover:bg-neutral-50'
                  }
                `}
              >
                <Flex align="center" gap="sm">
                  {item.icon && (
                    <item.icon className="h-5 w-5" />
                  )}
                  {item.label}
                </Flex>
              </Link>
            </li>
          ))}
        </ul>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="md:hidden p-2 rounded-md hover:bg-neutral-50"
          aria-expanded={isOpen}
          aria-label="תפריט"
        >
          {isOpen ? (
            <XMarkIcon className="h-6 w-6" />
          ) : (
            <Bars3Icon className="h-6 w-6" />
          )}
        </button>
      </Flex>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden">
          <ul className="px-2 pt-2 pb-3 space-y-1">
            {filteredItems.map((item) => (
              <li key={item.label}>
                <Link
                  href={item.href}
                  className={`
                    block px-3 py-2 rounded-md transition-colors
                    ${isActiveLink(item.href)
                      ? 'bg-primary-50 text-primary-700'
                      : 'hover:bg-neutral-50'
                    }
                  `}
                  onClick={() => setIsOpen(false)}
                >
                  <Flex align="center" gap="sm">
                    {item.icon && (
                      <item.icon className="h-5 w-5" />
                    )}
                    {item.label}
                  </Flex>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </nav>
  );
}

// Example usage:
// const navItems: NavItem[] = [
//   {
//     label: 'דשבורד',
//     href: '/dashboard',
//     icon: HomeIcon,
//   },
//   {
//     label: 'ניהול',
//     href: '/admin',
//     icon: CogIcon,
//     roles: ['admin', 'super_admin'],
//   },
// ]; 