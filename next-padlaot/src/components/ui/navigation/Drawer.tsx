'use client';

import { useEffect, useRef } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  position?: 'right' | 'left';
  className?: string;
}

export function Drawer({
  open,
  onClose,
  children,
  position = 'right', // RTL-friendly default
  className = '',
}: DrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);

  // Handle click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (drawerRef.current && !drawerRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      // Prevent body scroll when drawer is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  // Handle escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    if (open) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-neutral-900/20 backdrop-blur-sm z-40 transition-opacity"
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        className={`
          fixed top-0 bottom-0 w-[280px] max-w-[calc(100vw-2rem)] z-50
          transition-transform duration-300 ease-in-out bg-white shadow-lg
          ${position === 'right' ? 'right-0' : 'left-0'}
          ${className}
        `}
      >
        {/* Close Button */}
        <div className="flex justify-end p-4">
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-100 rounded-full transition-colors"
            aria-label="סגור"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto h-[calc(100vh-4rem)]">
          {children}
        </div>
      </div>
    </>
  );
}

// Example usage:
// const [isOpen, setIsOpen] = useState(false);
//
// <Drawer open={isOpen} onClose={() => setIsOpen(false)}>
//   <div className="p-4">
//     <h2 className="text-xl font-bold mb-4">תפריט</h2>
//     <nav>
//       <ul className="space-y-2">
//         <li>קישור 1</li>
//         <li>קישור 2</li>
//       </ul>
//     </nav>
//   </div>
// </Drawer> 