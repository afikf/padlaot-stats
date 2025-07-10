'use client';

import { useEffect, useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { ExclamationTriangleIcon, CheckCircleIcon, InformationCircleIcon } from '@heroicons/react/24/solid';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onClose?: () => void;
}

const ICONS = {
  success: <CheckCircleIcon className="h-5 w-5 text-green-400" />,
  error: <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />,
  warning: <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />,
  info: <InformationCircleIcon className="h-5 w-5 text-blue-400" />
};

const STYLES = {
  success: 'bg-green-50 text-green-800 border-green-200',
  error: 'bg-red-50 text-red-800 border-red-200',
  warning: 'bg-yellow-50 text-yellow-800 border-yellow-200',
  info: 'bg-blue-50 text-blue-800 border-blue-200'
};

export function Toast({ message, type = 'info', duration = 5000, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    if (duration) {
      const timer = setTimeout(() => {
        handleClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration]);

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(() => {
      setIsVisible(false);
      onClose?.();
    }, 300); // Match the animation duration
  };

  if (!isVisible) return null;

  return (
    <div
      className={`
        fixed bottom-4 right-4 z-50 flex items-center gap-3
        max-w-md rounded-lg border p-4 shadow-lg
        transition-all duration-300 ease-in-out
        ${STYLES[type]}
        ${isLeaving ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'}
      `}
      role="alert"
    >
      <div className="flex-shrink-0">
        {ICONS[type]}
      </div>
      
      <p className="flex-1 text-sm font-medium">
        {message}
      </p>

      <button
        onClick={handleClose}
        className={`
          flex-shrink-0 rounded-lg p-1.5
          hover:bg-black/5 focus:outline-none
          focus:ring-2 focus:ring-offset-2
          ${type === 'error' ? 'focus:ring-red-500' :
            type === 'success' ? 'focus:ring-green-500' :
            type === 'warning' ? 'focus:ring-yellow-500' :
            'focus:ring-blue-500'}
        `}
      >
        <span className="sr-only">Close</span>
        <XMarkIcon className="h-4 w-4" />
      </button>
    </div>
  );
} 