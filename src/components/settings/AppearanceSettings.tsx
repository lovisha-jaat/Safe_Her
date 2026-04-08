import { Moon, Sun, Monitor } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

type Theme = "light" | "dark" | "system";

const AppearanceSettings = () => {
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem("theme") as Theme) || "light";
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "system") {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.classList.toggle("dark", prefersDark);
    } else {
      root.classList.toggle("dark", theme === "dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  const options = [
    { value: "light" as Theme, icon: Sun, label: "Light", desc: "Bright and clean" },
    { value: "dark" as Theme, icon: Moon, label: "Dark", desc: "Easy on the eyes" },
    { value: "system" as Theme, icon: Monitor, label: "System", desc: "Follow device settings" },
  ];

  return (
    <div className="space-y-3">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => {
            setTheme(opt.value);
            toast.success(`Theme set to ${opt.label}`);
          }}
          className={`w-full flex items-center gap-3 rounded-xl p-4 transition-all ${
            theme === opt.value
              ? "bg-primary/10 ring-2 ring-primary"
              : "bg-secondary/50"
          }`}
        >
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
            theme === opt.value ? "bg-primary text-primary-foreground" : "bg-primary/10"
          }`}>
            <opt.icon className={`w-4 h-4 ${theme === opt.value ? "text-primary-foreground" : "text-primary"}`} />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-foreground">{opt.label}</p>
            <p className="text-xs text-muted-foreground">{opt.desc}</p>
          </div>
        </button>
      ))}
    </div>
  );
};

export default AppearanceSettings;
