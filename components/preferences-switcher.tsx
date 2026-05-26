"use client"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SlidersHorizontal } from "lucide-react"
import { useUIPreferences, THEMES, DENSITIES } from "@/lib/theme"
import { cn } from "@/lib/utils"

export function PreferencesSwitcher() {
  const { theme, density, setTheme, setDensity } = useUIPreferences()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/6 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        aria-label="Preferences"
      >
        <SlidersHorizontal className="h-3.5 w-3.5" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-52 p-2 space-y-3">
        {/* Theme */}
        <div>
          <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider font-medium px-1 mb-1.5">
            Theme
          </p>
          <div className="grid grid-cols-2 gap-1">
            {THEMES.map((t: any) => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={cn(
                  "flex items-center gap-2 text-xs px-2 py-1.5 rounded transition-colors text-left",
                  theme === t.id
                    ? "bg-white/10 text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5",
                )}
              >
                <span className={cn("h-2 w-2 rounded-full flex-shrink-0", t.dot)} />
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Density */}
        <div>
          <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider font-medium px-1 mb-1.5">
            Density
          </p>
          <div className="grid grid-cols-2 gap-1">
            {DENSITIES.map((d: any) => (
              <button
                key={d.id}
                onClick={() => setDensity(d.id)}
                className={cn(
                  "text-xs px-2 py-1.5 rounded transition-colors text-left",
                  density === d.id
                    ? "bg-white/10 text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5",
                )}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
