"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User, Workspace } from "@/types";

interface AuthStore {
  user: User | null;
  workspace: Workspace | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, workspace: Workspace, token: string) => void;
  setToken: (token: string) => void;
  setWorkspace: (workspace: Workspace) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      workspace: null,
      token: null,
      isAuthenticated: false,

      setAuth: (user, workspace, token) =>
        set({ user, workspace, token, isAuthenticated: true }),

      setToken: (token) => set({ token, isAuthenticated: true }),

      setWorkspace: (workspace) => set({ workspace }),

      logout: () =>
        set({
          user: null,
          workspace: null,
          token: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: "neuralops-auth",
      partialize: (state) => ({
        user: state.user,
        workspace: state.workspace,
        // Don't persist token — it's short-lived; refresh via cookie
      }),
    }
  )
);
