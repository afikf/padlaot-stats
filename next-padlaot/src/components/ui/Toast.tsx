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
  success: <CheckCircleIcon style={{ height: '20px', width: '20px', color: '#10b981' }} />,
  error: <ExclamationTriangleIcon style={{ height: '20px', width: '20px', color: '#ef4444' }} />,
  warning: <ExclamationTriangleIcon style={{ height: '20px', width: '20px', color: '#f59e0b' }} />,
  info: <InformationCircleIcon style={{ height: '20px', width: '20px', color: '#3b82f6' }} />
};

const BACKGROUND_COLORS = {
  success: '#f0fdf4',
  error: '#fef2f2',
  warning: '#fffbeb',
  info: '#eff6ff'
};

const BORDER_COLORS = {
  success: '#bbf7d0',
  error: '#fecaca',
  warning: '#fed7aa',
  info: '#bfdbfe'
};

const TEXT_COLORS = {
  success: '#166534',
  error: '#991b1b',
  warning: '#92400e',
  info: '#1e40af'
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

  const baseStyles: React.CSSProperties = {
    backgroundColor: BACKGROUND_COLORS[type],
    border: `1px solid ${BORDER_COLORS[type]}`,
    borderRadius: '12px',
    padding: '16px 20px',
    minWidth: '300px',
    maxWidth: '400px',
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    transform: isLeaving ? 'translateX(100%)' : 'translateX(0)',
    opacity: isLeaving ? 0 : 1,
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontSize: '14px',
    lineHeight: '1.5',
    color: TEXT_COLORS[type],
  };

  return (
    <div style={baseStyles} role="alert">
      <div style={{ flexShrink: 0, marginTop: '2px' }}>
        {ICONS[type]}
      </div>
      
      <div style={{ flex: 1, marginRight: '8px' }}>
        {message}
      </div>

      <button
        onClick={handleClose}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '4px',
          borderRadius: '4px',
          color: TEXT_COLORS[type],
          opacity: 0.7,
          transition: 'opacity 0.2s ease',
          flexShrink: 0,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = '1';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = '0.7';
        }}
        aria-label="Close notification"
      >
        <XMarkIcon style={{ height: '16px', width: '16px' }} />
      </button>
    </div>
  );
} 