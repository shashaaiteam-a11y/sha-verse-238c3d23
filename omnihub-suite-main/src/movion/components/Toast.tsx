// Movion Toast Component
import React from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { useMovionStore } from '../store';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useMovionStore();

  return (
    <div className="fixed bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 z-[200] flex flex-col gap-3 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`
            pointer-events-auto flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl backdrop-blur-xl
            animate-in slide-in-from-bottom-4 fade-in duration-300
            ${toast.type === 'success' ? 'bg-green-600/95 text-white' : ''}
            ${toast.type === 'error' ? 'bg-red-600/95 text-white' : ''}
            ${toast.type === 'info' ? 'bg-[#323232]/95 text-white' : ''}
          `}
        >
          {toast.type === 'success' && <CheckCircle size={20} />}
          {toast.type === 'error' && <AlertCircle size={20} />}
          {toast.type === 'info' && <Info size={20} />}
          
          <span className="text-sm font-bold">{toast.message}</span>
          
          <button
            onClick={() => removeToast(toast.id)}
            className="p-1 hover:bg-white/20 rounded-full transition-colors ml-2"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
};

export default ToastContainer;
