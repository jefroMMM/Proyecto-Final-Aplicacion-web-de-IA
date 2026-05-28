import { create } from "zustand";

import type { Transcript } from "@/types/api";

type BackendStatus = "unknown" | "ok" | "offline" | string;

interface InterviewStore {
  backendStatus: BackendStatus;
  currentInterviewId: string | null;
  isRecording: boolean;
  isProcessingTurn: boolean;
  timeline: Transcript[];
  setBackendStatus: (status: BackendStatus) => void;
  setCurrentInterviewId: (interviewId: string | null) => void;
  setRecording: (isRecording: boolean) => void;
  setProcessingTurn: (isProcessingTurn: boolean) => void;
  setTimeline: (timeline: Transcript[]) => void;
  appendTimeline: (items: Transcript[]) => void;
}

export const useInterviewStore = create<InterviewStore>((set) => ({
  backendStatus: "unknown",
  currentInterviewId: null,
  isRecording: false,
  isProcessingTurn: false,
  timeline: [],
  setBackendStatus: (backendStatus) => set({ backendStatus }),
  setCurrentInterviewId: (currentInterviewId) => set({ currentInterviewId }),
  setRecording: (isRecording) => set({ isRecording }),
  setProcessingTurn: (isProcessingTurn) => set({ isProcessingTurn }),
  setTimeline: (timeline) => set({ timeline }),
  appendTimeline: (items) =>
    set((state) => ({
      timeline: [...state.timeline, ...items],
    })),
}));
