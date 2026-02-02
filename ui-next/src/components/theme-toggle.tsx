"use client";

import { useTheme } from "./theme-provider";
import { SunIcon, MoonIcon, MonitorIcon } from "lucide-react";

type ThemeToggleProps = {
  className?: string;
};

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();

  const cycleTheme = () => {
    if (theme === "light") {
      setTheme("dark");
    } else if (theme === "dark") {
      setTheme("system");
    } else {
      setTheme("light");
    }
  };

  const getIcon = () => {
    switch (theme) {
      case "light":
        return <SunIcon className="w-5 h-5" />;
      case "dark":
        return <MoonIcon className="w-5 h-5" />;
      case "system":
        return <MonitorIcon className="w-5 h-5" />;
    }
  };

  const getLabel = () => {
    switch (theme) {
      case "light":
        return "Light mode";
      case "dark":
        return "Dark mode";
      case "system":
        return "System theme";
    }
  };

  return (
    <button
      onClick={cycleTheme}
      className={`p-2.5 rounded-xl transition-all duration-200 hover:bg-accent/50 text-muted-foreground hover:text-foreground ${className ?? ""}`}
      title={getLabel()}
      aria-label={getLabel()}
    >
      {getIcon()}
    </button>
  );
}

type ThemeDropdownProps = {
  className?: string;
};

export function ThemeDropdown({ className }: ThemeDropdownProps) {
  const { theme, setTheme } = useTheme();

  return (
    <div className={`flex flex-col gap-1 ${className ?? ""}`}>
      <label className="text-sm font-medium text-muted-foreground">Theme</label>
      <div className="flex gap-1 p-1 bg-background/50 rounded-xl border border-border/50">
        <button
          onClick={() => setTheme("light")}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
            theme === "light"
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
          }`}
          title="Light mode"
        >
          <SunIcon className="w-4 h-4" />
          <span className="hidden sm:inline">Light</span>
        </button>
        <button
          onClick={() => setTheme("dark")}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
            theme === "dark"
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
          }`}
          title="Dark mode"
        >
          <MoonIcon className="w-4 h-4" />
          <span className="hidden sm:inline">Dark</span>
        </button>
        <button
          onClick={() => setTheme("system")}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
            theme === "system"
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
          }`}
          title="System theme"
        >
          <MonitorIcon className="w-4 h-4" />
          <span className="hidden sm:inline">System</span>
        </button>
      </div>
    </div>
  );
}
