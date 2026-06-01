import { create } from "zustand";

export type ToastKind = "success" | "error" | "info";

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  kind: ToastKind;
  durationMs: number;
}

interface ToastState {
  toasts: ToastMessage[];
  showToast: (message: Omit<ToastMessage, "id" | "durationMs"> & { durationMs?: number }) => void;
  dismissToast: (id: string) => void;
}

export const useToast = create<ToastState>((set) => ({
  toasts: [],
  showToast: (message) => {
    const id = crypto.randomUUID();
    const durationMs = message.durationMs ?? 4500;
    set((state) => ({ toasts: [...state.toasts, { ...message, id, durationMs }] }));
    window.setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) }));
    }, durationMs);
  },
  dismissToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
}));
