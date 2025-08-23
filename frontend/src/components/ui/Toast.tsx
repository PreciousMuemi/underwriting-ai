import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

export type ToastVariant = 'success' | 'error' | 'info';

interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  show: (message: string, variant?: ToastVariant, durationMs?: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<ToastItem[]>([]);

  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback((message: string, variant: ToastVariant = 'info', durationMs = 3000) => {
    const id = Math.random().toString(36).slice(2);
    setItems((prev) => [...prev, { id, message, variant }]);
    window.setTimeout(() => remove(id), durationMs);
  }, [remove]);

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
        {items.map((t) => (
          <div
            key={t.id}
            className={`min-w-[240px] max-w-[360px] rounded-md shadow px-4 py-3 text-sm border 
              ${t.variant === 'success' ? 'bg-green-50 text-green-800 border-green-200' : ''}
              ${t.variant === 'error' ? 'bg-red-50 text-red-800 border-red-200' : ''}
              ${t.variant === 'info' ? 'bg-gray-800 text-white border-gray-700' : ''}
            `}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const ToastContainer: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  // Backward-compat shim if someone mounts just the container
  return <>{children}</>;
};
