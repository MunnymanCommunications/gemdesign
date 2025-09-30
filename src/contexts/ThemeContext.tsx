import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useTheme as useNextTheme } from 'next-themes';
import { supabase } from '@/integrations/supabase/client';
import { hexToHsl } from '@/lib/utils';
interface UserTheme {
  logo_url?: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  background_color: string;
  background_color_light: string;
  background_color_dark: string;
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
  background_color_light: '#ffffff',
  background_color_dark: '#000000',
  text_color: '#1f2937',
};

const ThemeContext = createContext<ThemeContextType>({
  theme: defaultTheme,
  setTheme: () => {},
  loadTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }: { children: ReactNode }): JSX.Element => {
  const { user } = useAuth();
  const { theme: nextTheme } = useNextTheme();
  const [theme, setTheme] = useState<UserTheme>(defaultTheme);

  const getCurrentBackground = (userTheme: UserTheme) => {
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    const currentThemeMode = nextTheme === "system" ? systemTheme : nextTheme;
    return currentThemeMode === "dark"
      ? userTheme.background_color_dark
      : userTheme.background_color_light;
  };

  const applyTheme = (themeToApply: UserTheme) => {
    const root = document.documentElement;
    root.style.setProperty('--primary', hexToHsl(themeToApply.primary_color));
    root.style.setProperty('--secondary', hexToHsl(themeToApply.secondary_color));
    root.style.setProperty('--accent', hexToHsl(themeToApply.accent_color));
    root.style.setProperty('--background', hexToHsl(getCurrentBackground(themeToApply)));
    root.style.setProperty('--foreground', hexToHsl(themeToApply.text_color));

    const favicon = document.getElementById('favicon') as HTMLLinkElement;
    if (favicon) {
      favicon.href = `/logo.png?v=${new Date().getTime()}`;
    }
  };

  const loadTheme = async () => {
    if (!user) {
      setTheme(defaultTheme);
      applyTheme(defaultTheme);
      return;
    }

    const { data, error } = await supabase
      .from('user_themes')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (data) {
      setTheme(data);
      applyTheme(data);
    } else if (!error) {
      // No theme found, so create a default one
      const { data: newTheme, error: insertError } = await supabase
        .from('user_themes')
        .insert({ ...defaultTheme, user_id: user.id })
        .select('*')
        .single();
      
      if (newTheme) {
        setTheme(newTheme);
        applyTheme(newTheme);
      } else {
        setTheme(defaultTheme);
        applyTheme(defaultTheme);
      }
    } else {
      // An actual error occurred
      setTheme(defaultTheme);
      applyTheme(defaultTheme);
    }
  };

  useEffect(() => {
    loadTheme();
  }, [user]);

  useEffect(() => {
    if (theme) {
      applyTheme(theme);
    }
  }, [nextTheme, theme]);

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
}