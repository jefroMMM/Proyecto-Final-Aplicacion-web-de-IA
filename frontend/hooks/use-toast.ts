import { create } from "zustand";

export type ToastKind = "success" | "error" | "info";

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  kind: ToastKind;
}

interface ToastState {
  toasts: ToastMessage[];
  showToast: (message: Omit<ToastMessage, "id">) => void;
  dismissToast: (id: string) => void;
}

export const useToast = create<ToastState>((set) => ({
  toasts: [],
  showToast: (message) => {
    const id = crypto.randomUUID();
    set((state) => ({ toasts: [...state.toasts, { ...message, id }] }));
    window.setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) }));
    }, 4500);
  },
  dismissToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
}));
