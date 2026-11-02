import { AnimatePresence, m } from 'framer-motion';
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';

interface ToastItem {
  id: number;
  kind: 'success' | 'error';
  text: string;
}
const ToastCtx = createContext<(text: string, kind?: ToastItem['kind']) => void>(() => undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const push = useCallback((text: string, kind: ToastItem['kind'] = 'success') => {
    if (!text) return; // e.g. a request the user cancelled
    const id = Date.now() + Math.random();
    setItems((s) => [...s.slice(-2), { id, kind, text }]);
    setTimeout(() => setItems((s) => s.filter((x) => x.id !== id)), 3800);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-4 z-[200] flex flex-col items-center gap-2 px-4"
        aria-live="polite"
      >
        <AnimatePresence>
          {items.map((t) => (
            <m.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              className="border-border bg-surface pointer-events-auto flex max-w-md items-center gap-2 rounded-2xl border px-4 py-3 text-sm shadow-2xl"
            >
              {t.kind === 'success' ? (
                <CheckCircle2 size={18} className="text-easy shrink-0" />
              ) : (
                <AlertCircle size={18} className="text-danger shrink-0" />
              )}
              {t.text}
            </m.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);
