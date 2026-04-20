"use client"

import { useEffect, useState } from "react"
import { Moon, Sun, Glasses } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"

export function ModeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Avoid hydration mismatch by waiting for mount
  useEffect(() => {
    setMounted(true)
  }, [])

  const cycleTheme = () => {
    if (theme === "light") setTheme("dark")
    else if (theme === "dark") setTheme("eye-comfort")
    else setTheme("light")
  }

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="rounded-xl h-10 w-10 opacity-0">
        <Sun className="h-[1.2rem] w-[1.2rem]" />
      </Button>
    )
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="rounded-xl h-10 w-10 text-muted-foreground hover:text-foreground hover:bg-muted transition-all active:scale-95"
      onClick={cycleTheme}
    >
      <div className="relative h-[1.2rem] w-[1.2rem] flex items-center justify-center">
        {theme === "light" && <Sun className="h-[1.2rem] w-[1.2rem] transition-all" />}
        {theme === "dark" && <Moon className="h-[1.2rem] w-[1.2rem] transition-all" />}
        {theme === "eye-comfort" && <Glasses className="h-[1.2rem] w-[1.2rem] transition-all text-amber-600" />}
        
        {/* Fallback for system theme or undefined */}
        {(theme !== "light" && theme !== "dark" && theme !== "eye-comfort") && <Sun className="h-[1.2rem] w-[1.2rem]" />}
      </div>
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
