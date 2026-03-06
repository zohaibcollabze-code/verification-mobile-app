/**
 * MPVP — Theme Store (Zustand)
 * Manages application theme mode (dark/light).
 */
import { create } from 'zustand';

export type ThemeMode = 'dark' | 'light';

interface ThemeState {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  themeMode: 'light', // Default to light theme
  setThemeMode: (mode) => set({ themeMode: mode }),
  toggleTheme: () => set((state) => ({ 
    themeMode: state.themeMode === 'dark' ? 'light' : 'dark' 
  })),
}));
