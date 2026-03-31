import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { AnimatePresence, motion } from 'motion/react';

interface ErrorMessage {
  id: string;
  message: string;
  status?: number;
}

interface ErrorContextType {
  showError: (message: string, status?: number) => void;
}

const ErrorContext = createContext<ErrorContextType | undefined>(undefined);

export const useGlobalError = () => {
  const context = useContext(ErrorContext);
  if (!context) throw new Error("useGlobalError must be used within a GlobalErrorProvider");
  return context;
};

export const GlobalErrorProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [errors, setErrors] = useState<ErrorMessage[]>([]);

  const showError = useCallback((message: string, status?: number) => {
    const id = Math.random().toString(36).substring(2, 9);
    setErrors(prev => [...prev, { id, message, status }]);
    
    // Auto dismiss after 5 seconds
    setTimeout(() => {
      setErrors(prev => prev.filter(e => e.id !== id));
    }, 5000);
  }, []);

  const removeError = (id: string) => {
    setErrors(prev => prev.filter(e => e.id !== id));
  };

  return (
    <ErrorContext.Provider value={{ showError }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {errors.map(err => (
            <motion.div
              key={err.id}
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              className="bg-red-950/90 border border-red-500/50 text-red-200 px-4 py-3 rounded shadow-lg flex items-center gap-3 w-80 pointer-events-auto backdrop-blur-sm"
            >
              <div className="flex-1 flex flex-col">
                <span className="font-bold text-sm">
                  {err.status ? `Error ${err.status}` : 'System Error'}
                </span>
                <span className="text-xs opacity-90">{err.message}</span>
              </div>
              <button 
                onClick={() => removeError(err.id)}
                className="text-red-400 hover:text-red-200 transition-colors"
                aria-label="Dismiss error"
              >
                ✕
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ErrorContext.Provider>
  );
}
