import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(() => {
    try {
      const saved = localStorage.getItem('sahatn_theme');
      if (saved) return saved === 'dark';
      return document.documentElement.classList.contains('dark');
    } catch (e) {
      return false;
    }
  });

  // Apply theme to DOM and persist to localStorage
  useEffect(() => {
    try {
      if (isDark) {
        document.documentElement.classList.add('dark');
        document.body.classList.add('dark');
        localStorage.setItem('sahatn_theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        document.body.classList.remove('dark');
        localStorage.setItem('sahatn_theme', 'light');
      }

      window.dispatchEvent(
        new CustomEvent('sahatn:themechange', { detail: { isDark, theme: isDark ? 'dark' : 'light' } })
      );
    } catch (e) {
      console.warn('Error applying theme:', e);
    }
  }, [isDark]);

  // Synchronize across browser tabs
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === 'sahatn_theme') {
        setIsDark(e.newValue === 'dark');
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const toggleTheme = useCallback(() => {
    setIsDark((prev) => !prev);
  }, []);

  const setTheme = useCallback((theme) => {
    setIsDark(theme === 'dark');
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        isDark,
        theme: isDark ? 'dark' : 'light',
        toggleTheme,
        setTheme
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    // Fallback if rendered outside ThemeProvider
    const isDark = typeof document !== 'undefined' && (document.documentElement.classList.contains('dark') || localStorage.getItem('sahatn_theme') === 'dark');
    return {
      isDark,
      theme: isDark ? 'dark' : 'light',
      toggleTheme: () => {
        const next = !isDark;
        if (next) {
          document.documentElement.classList.add('dark');
          document.body?.classList.add('dark');
          localStorage.setItem('sahatn_theme', 'dark');
        } else {
          document.documentElement.classList.remove('dark');
          document.body?.classList.remove('dark');
          localStorage.setItem('sahatn_theme', 'light');
        }
      },
      setTheme: (t) => {
        if (t === 'dark') {
          document.documentElement.classList.add('dark');
          document.body?.classList.add('dark');
          localStorage.setItem('sahatn_theme', 'dark');
        } else {
          document.documentElement.classList.remove('dark');
          document.body?.classList.remove('dark');
          localStorage.setItem('sahatn_theme', 'light');
        }
      }
    };
  }
  return context;
};

export default ThemeContext;

