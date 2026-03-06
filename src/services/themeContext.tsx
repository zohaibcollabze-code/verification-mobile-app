/**
 * DEPRECATED: Theme is now handled via design system tokens in @/constants/colors.
 * This file provides a no-op ThemeProvider and useTheme for backward compatibility.
 */
import React, { createContext, useContext } from 'react';
import { Colors } from '@/constants/colors';

interface ThemeContextType {
  theme: typeof Colors;
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: Colors,
  isDark: false,
  toggleTheme: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ThemeContext.Provider value={{ theme: Colors, isDark: false, toggleTheme: () => {} }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  return useContext(ThemeContext);
};
