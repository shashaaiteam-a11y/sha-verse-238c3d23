// Undo Context - For "Not Interested" undo functionality
import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { X, Undo2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UndoItem {
  id: string;
  message: string;
  onUndo: () => void;
  timestamp: number;
}

interface UndoContextType {
  showUndoSnackbar: (message: string, onUndo: () => void) => void;
}

const UndoContext = createContext<UndoContextType | null>(null);

export const UndoProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [undoItems, setUndoItems] = useState<UndoItem[]>([]);

  const showUndoSnackbar = useCallback((message: string, onUndo: () => void) => {
    const id = Math.random().toString(36).substr(2, 9);
    setUndoItems(prev => [...prev, { id, message, onUndo, timestamp: Date.now() }]);
  }, []);

  const removeItem = useCallback((id: string) => {
    setUndoItems(prev => prev.filter(item => item.id !== id));
  }, []);

  const handleUndo = useCallback((item: UndoItem) => {
    item.onUndo();
    removeItem(item.id);
  }, [removeItem]);

  // Auto-dismiss after 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setUndoItems(prev => prev.filter(item => now - item.timestamp < 5000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <UndoContext.Provider value={{ showUndoSnackbar }}>
      {children}
      
      {/* Undo Snackbar Container */}
      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 pointer-events-none">
        {undoItems.map((item) => (
          <div
            key={item.id}
            className={cn(
              "flex items-center gap-3 px-4 py-3 bg-[#323232] text-white rounded-lg shadow-xl",
              "animate-in slide-in-from-bottom-2 fade-in duration-300 pointer-events-auto min-w-[280px]"
            )}
          >
            <span className="flex-1 text-sm">{item.message}</span>
            <button
              onClick={() => handleUndo(item)}
              className="flex items-center gap-1 text-blue-400 hover:text-blue-300 text-sm font-medium"
            >
              <Undo2 size={16} />
              Undo
            </button>
            <button
              onClick={() => removeItem(item.id)}
              className="text-gray-400 hover:text-white"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </UndoContext.Provider>
  );
};

export const useUndo = () => {
  const context = useContext(UndoContext);
  if (!context) {
    throw new Error('useUndo must be used within UndoProvider');
  }
  return context;
};
