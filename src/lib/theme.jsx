import React from "react";

const STORAGE_KEY = "ghazatech-theme";

const ThemeContext = React.createContext({
  theme: "dark",
  setTheme: () => {},
  toggleTheme: () => {},
});

const resolveInitialTheme = () => {
  if (typeof window === "undefined") {
    return "dark";
  }

  const savedTheme = window.localStorage.getItem(STORAGE_KEY);

  if (savedTheme === "light" || savedTheme === "dark") {
    return savedTheme;
  }

  return window.matchMedia?.("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
};

const applyTheme = (theme) => {
  const root = document.documentElement;

  root.classList.remove("light", "dark");

  root.classList.add(theme);
  root.style.colorScheme = theme;
};

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = React.useState(resolveInitialTheme);

  React.useEffect(() => {
    applyTheme(theme);

    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const setTheme = React.useCallback((nextTheme) => {
    setThemeState(nextTheme === "light" ? "light" : "dark");
  }, []);

  const toggleTheme = React.useCallback(() => {
    setThemeState((currentTheme) =>
      currentTheme === "dark" ? "light" : "dark",
    );
  }, []);

  const value = React.useMemo(
    () => ({
      theme,
      setTheme,
      toggleTheme,
      isDark: theme === "dark",
    }),
    [theme, setTheme, toggleTheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  return React.useContext(ThemeContext);
}
