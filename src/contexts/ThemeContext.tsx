import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface UserTheme {
  logo_url?: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  background_color: string;
  text_color: string;
}

interface ThemeContextType {
  theme: UserTheme;
  setTheme: (theme: UserTheme) => void;
  loadTheme: () => void;
}

const defaultTheme: UserTheme = {
  primary_color: '#8b5cf6',
  secondary_color: '#a855f7',
  accent_color: '#ec4899',
  background_color: '#ffffff',
  text_color: '#1f2937',
};

const ThemeContext = createContext<ThemeContextType>({
  theme: defaultTheme,
  setTheme: () => {},
  loadTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [theme, setTheme] = useState<UserTheme>(defaultTheme);

  const applyTheme = (themeToApply: UserTheme) => {
    const root = document.documentElement;
    root.style.setProperty('--primary', themeToApply.primary_color);
    root.style.setProperty('--secondary', themeToApply.secondary_color);
    root.style.setProperty('--accent', themeToApply.accent_color);
    root.style.setProperty('--background', themeToApply.background_color);
    root.style.setProperty('--foreground', themeToApply.text_color);

    const favicon = document.getElementById('favicon') as HTMLLinkElement;
    if (favicon) {
      favicon.href = themeToApply.logo_url || '/favicon.ico';
    }
  };

  const loadTheme = () => {
    if (user) {
      const savedTheme = localStorage.getItem(`user_theme_${user.id}`);
      if (savedTheme) {
        try {
          const parsedTheme = JSON.parse(savedTheme);
          setTheme(parsedTheme);
          applyTheme(parsedTheme);
        } catch (error) {
          console.error('Error parsing saved theme:', error);
        }
      } else {
        applyTheme(defaultTheme);
      }
    } else {
        applyTheme(defaultTheme);
    }
  };

  useEffect(() => {
    loadTheme();
  }, [user]);

  const value = {
    theme,
    setTheme: (newTheme: UserTheme) => {
      setTheme(newTheme);
      applyTheme(newTheme);
    },
    loadTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};