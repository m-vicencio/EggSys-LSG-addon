"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { type ReactNode, useEffect, useState } from "react";
import { Toaster } from "./ui/sonner";

const PALETTE_STORAGE_KEY = "color-palette";
const LEGACY_THEME_STORAGE_KEY = "theme";
const paletteValues = new Set([
  "slate",
  "miaupuchino",
  "lavanda",
  "manzana-verde",
  "marea",
]);

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  useEffect(() => {
    const legacyTheme = localStorage.getItem(LEGACY_THEME_STORAGE_KEY);
    const isLegacyPalette =
      typeof legacyTheme === "string" && paletteValues.has(legacyTheme);

    if (isLegacyPalette) {
      localStorage.setItem(PALETTE_STORAGE_KEY, legacyTheme);
      localStorage.setItem(LEGACY_THEME_STORAGE_KEY, "system");
    }

    const savedPalette =
      localStorage.getItem(PALETTE_STORAGE_KEY) ??
      (isLegacyPalette ? legacyTheme : "slate");

    if (savedPalette) {
      document.documentElement.setAttribute("data-theme", savedPalette);
    }
  }, []);

  return (
    <SessionProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <QueryClientProvider client={queryClient}>
          <Toaster />
          {children}
        </QueryClientProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
