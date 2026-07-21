import React from "react";

const ThemeContext = React.createContext(null);
const STORAGE_KEY = "ghazatech-theme";
const VALID_THEMES = new Set(["light", "dark", "system"]);

const getSystemTheme = () =>
  window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";

const applyTheme = (theme) => {
  const root = document.documentElement;
  const resolved = theme === "system" ? getSystemTheme() : theme;

  root.classList.remove("light", "dark");
  root.classList.add(resolved);
  root.style.colorScheme = resolved;
  root.dataset.theme = resolved;
  root.dataset.themePreference = theme;

  return resolved;
};

export function ThemeProvider({
  children,
  defaultTheme = "system",
}) {
  const [theme, setThemeState] = React.useState(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return VALID_THEMES.has(saved) ? saved : defaultTheme;
  });

  const [resolvedTheme, setResolvedTheme] = React.useState(() =>
    theme === "system" ? getSystemTheme() : theme,
  );

  React.useEffect(() => {
    setResolvedTheme(applyTheme(theme));
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  React.useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    const handleChange = () => {
      if (theme === "system") {
        setResolvedTheme(applyTheme("system"));
      }
    };

    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, [theme]);

  const setTheme = React.useCallback((nextTheme) => {
    if (VALID_THEMES.has(nextTheme)) {
      setThemeState(nextTheme);
    }
  }, []);

  const toggleTheme = React.useCallback(() => {
    setThemeState(resolvedTheme === "dark" ? "light" : "dark");
  }, [resolvedTheme]);

  const value = React.useMemo(
    () => ({
      theme,
      resolvedTheme,
      setTheme,
      toggleTheme,
    }),
    [theme, resolvedTheme, setTheme, toggleTheme],
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = React.useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used inside ThemeProvider.");
  }

  return context;
}
