import Link from 'next/link';
import { ChevronLeftIcon } from '@heroicons/react/24/outline';
import { BreadcrumbItem } from '@/types/navigation';
import { Flex } from '../layout/Flex';

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
  separator?: React.ReactNode;
}

export function Breadcrumbs({
  items,
  className = '',
  separator = <ChevronLeftIcon className="h-4 w-4 text-neutral-400" />,
}: BreadcrumbsProps) {
  return (
    <nav aria-label="מיקום בניווט" className={className}>
      <ol className="flex items-center flex-wrap">
        {items.map((item, index) => (
          <li key={item.label}>
            <div className="flex items-center">
              {index > 0 && (
                <span className="mx-2 text-neutral-400" aria-hidden="true">
                  {separator}
                </span>
              )}
              
              {item.href ? (
                <Link
                  href={item.href}
                  className="text-sm text-neutral-600 hover:text-primary-600 transition-colors"
                >
                  {item.label}
                </Link>
              ) : (
                <span className="text-sm text-neutral-900 font-medium">
                  {item.label}
                </span>
              )}
            </div>
          </li>
        ))}
      </ol>
    </nav>
  );
}

// Example usage:
// const breadcrumbs: BreadcrumbItem[] = [
//   { label: 'דשבורד', href: '/dashboard' },
//   { label: 'שחקנים', href: '/dashboard/players' },
//   { label: 'עריכת שחקן' },  // Current page, no href
// ];
//
// <Breadcrumbs items={breadcrumbs} /> 