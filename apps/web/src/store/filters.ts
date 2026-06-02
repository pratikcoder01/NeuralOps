"use client";
import { create } from "zustand";
import type { IncidentFilters, Severity, IncidentStatus } from "@/types";

interface FiltersStore {
  filters: IncidentFilters;
  setFilter: <K extends keyof IncidentFilters>(key: K, value: IncidentFilters[K]) => void;
  resetFilters: () => void;
  setSeverity: (severity: Severity[]) => void;
  setStatus: (status: IncidentStatus[]) => void;
}

const defaultFilters: IncidentFilters = {
  severity: [],
  status: [],
  hostId: undefined,
  search: "",
  dateFrom: undefined,
  dateTo: undefined,
  page: 1,
  pageSize: 25,
};

export const useFiltersStore = create<FiltersStore>((set) => ({
  filters: { ...defaultFilters },

  setFilter: (key, value) =>
    set((state) => ({
      filters: { ...state.filters, [key]: value, page: key !== "page" ? 1 : (value as number) },
    })),

  resetFilters: () => set({ filters: { ...defaultFilters } }),

  setSeverity: (severity) =>
    set((state) => ({ filters: { ...state.filters, severity, page: 1 } })),

  setStatus: (status) =>
    set((state) => ({ filters: { ...state.filters, status, page: 1 } })),
}));
