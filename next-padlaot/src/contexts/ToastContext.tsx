'use client';

import { createContext, useContext, useState, useCallback } from 'react';
import { Toast, ToastType } from '@/components/ui/Toast';

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType>({
  showToast: () => {},
});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Array<{ id: number; message: string; type: ToastType }>>([]);
  const [lastId, setLastId] = useState(0);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = lastId + 1;
    setLastId(id);
    setToasts(current => [...current, { id, message, type }]);
  }, [lastId]);

  const handleClose = (id: number) => {
    setToasts(current => current.filter(toast => toast.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Render toasts */}
      <div className="fixed bottom-0 right-0 z-50 p-4 space-y-4">
        {toasts.map(toast => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => handleClose(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
} 