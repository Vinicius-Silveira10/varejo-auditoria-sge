'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export interface ToastMessage {
  id: string;
  type: 'error' | 'success' | 'info';
  message: string;
}

export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const router = useRouter();
  const pathname = usePathname();

  const addToast = useCallback((type: 'error' | 'success' | 'info', message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);
    
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  useEffect(() => {
    const handleApiError = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { status, message } = customEvent.detail;
      
      if (status === 401) {
        // Exibir o aviso antes de redirecionar, conforme especificado
        addToast('error', message || 'Sua sessão expirou, faça login novamente');
        
        // Redireciona para o login apenas se não estiver lá
        if (pathname !== '/login') {
          setTimeout(() => {
            router.push('/login');
          }, 1500);
        }
      } else if (status === 429) {
        addToast('error', message || 'Muitas requisições. Aguarde um instante.');
      }
    };

    const handleCustomToast = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { type, message } = customEvent.detail;
      addToast(type || 'info', message);
    };

    window.addEventListener('api-error', handleApiError);
    window.addEventListener('custom-toast', handleCustomToast);
    
    return () => {
      window.removeEventListener('api-error', handleApiError);
      window.removeEventListener('custom-toast', handleCustomToast);
    };
  }, [addToast, router, pathname]);

  return (
    <>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`p-4 rounded-md shadow-lg text-white max-w-sm ${
              toast.type === 'error' ? 'bg-red-600' : toast.type === 'success' ? 'bg-green-600' : 'bg-blue-600'
            } transition-all duration-300 transform translate-y-0 opacity-100`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </>
  );
}
