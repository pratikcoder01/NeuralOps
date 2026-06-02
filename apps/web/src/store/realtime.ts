"use client";
import { create } from "zustand";
import type { MetricSnapshot, HostStatus } from "@/types";

interface HostRealtimeData {
  metrics: MetricSnapshot;
  healthScore: number;
  status: HostStatus;
  updatedAt: string;
}

interface RealtimeStore {
  hostData: Record<string, HostRealtimeData>;
  wsConnected: boolean;
  setHostMetric: (hostId: string, data: HostRealtimeData) => void;
  setWsConnected: (connected: boolean) => void;
  clearHostData: () => void;
}

export const useRealtimeStore = create<RealtimeStore>((set) => ({
  hostData: {},
  wsConnected: false,

  setHostMetric: (hostId, data) =>
    set((state) => ({
      hostData: { ...state.hostData, [hostId]: data },
    })),

  setWsConnected: (connected) => set({ wsConnected: connected }),

  clearHostData: () => set({ hostData: {} }),
}));
