'use client';

import { CheckCircle2, XCircle, Info, X } from 'lucide-react';
import { useToast } from '@/context/ToastContext';

const icons = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
} as const;

const styles = {
  success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  error: 'border-red-500/30 bg-red-500/10 text-red-300',
  info: 'border-white/10 bg-white/[0.08] text-white/80',
} as const;

export default function ToastContainer() {
  const { toasts, dismiss } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 left-1/2 z-[100] -translate-x-1/2 flex flex-col gap-2 w-full max-w-sm px-4">
      {toasts.map((t) => {
        const Icon = icons[t.type];
        return (
          <div
            key={t.id}
            className={`flex items-center gap-2.5 rounded-xl border px-4 py-3 shadow-2xl backdrop-blur-2xl animate-slide-up ${styles[t.type]}`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <p className="flex-1 text-sm font-medium">{t.message}</p>
            <button
              onClick={() => dismiss(t.id)}
              className="shrink-0 rounded-full p-0.5 transition-colors hover:bg-white/10"
              aria-label="Dismiss notification"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
