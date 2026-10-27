"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";

const PALETTE_STORAGE_KEY = "color-palette";

const colorModes = [
  { label: "Claro", value: "light" },
  { label: "Oscuro", value: "dark" },
  { label: "Sistema", value: "system" },
] as const;

const themesList = [
  { label: "Original", value: "original" },
  { label: "Miaupuchino", value: "miaupuchino" },
  { label: "Lavanda", value: "lavanda" },
  { label: "Manzana verde", value: "manzana-verde" },
  { label: "Marea", value: "marea" },
] as const;

const palettePreview = {
  original: {
    light: {
      background: "#f8fafc",
      card: "#ffffff",
      foreground: "#0f172a",
      muted: "#64748b",
      primary: "#2563eb",
      accent: "#e2e8f0",
    },
    dark: {
      background: "#0f172a",
      card: "#1e293b",
      foreground: "#f8fafc",
      muted: "#94a3b8",
      primary: "#3b82f6",
      accent: "#334155",
    },
  },
  miaupuchino: {
    light: {
      background: "#eff1f5",
      card: "#e6e9ef",
      foreground: "#4c4f69",
      muted: "#8c8fa1",
      primary: "#8839ef",
      accent: "#bcc0cc",
    },
    dark: {
      background: "#1e1e2e",
      card: "#181825",
      foreground: "#cdd6f4",
      muted: "#a6adc8",
      primary: "#cba6f7",
      accent: "#45475a",
    },
  },
  lavanda: {
    light: {
      background: "#faf5ff",
      card: "#ffffff",
      foreground: "#4a044e",
      muted: "#7e22ce",
      primary: "#9333ea",
      accent: "#e9d5ff",
    },
    dark: {
      background: "#2e1065",
      card: "#3b0764",
      foreground: "#f3e8ff",
      muted: "#d8b4fe",
      primary: "#c084fc",
      accent: "#5b21b6",
    },
  },
  "manzana-verde": {
    light: {
      background: "#f7fee7",
      card: "#ffffff",
      foreground: "#3f6212",
      muted: "#4d7c0f",
      primary: "#84cc16",
      accent: "#d9f99d",
    },
    dark: {
      background: "#1a2e05",
      card: "#3f6212",
      foreground: "#ecfccb",
      muted: "#d9f99d",
      primary: "#a3e635",
      accent: "#65a30d",
    },
  },
  marea: {
    light: {
      background: "#ecfeff",
      card: "#ffffff",
      foreground: "#164e63",
      muted: "#0e7490",
      primary: "#06b6d4",
      accent: "#a5f3fc",
    },
    dark: {
      background: "#083344",
      card: "#164e63",
      foreground: "#cffafe",
      muted: "#a5f3fc",
      primary: "#22d3ee",
      accent: "#0e7490",
    },
  },
} as const;

export function ThemePalette() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [isMounted, setIsMounted] = useState(false);
  const [selectedPalette, setSelectedPalette] = useState<string>("original");

  const currentMode =
    theme === "system" ? (resolvedTheme ?? "light") : (theme ?? "light");
  const previewMode: "light" | "dark" =
    currentMode === "dark" ? "dark" : "light";

  useEffect(() => {
    setIsMounted(true);
    const savedPalette =
      localStorage.getItem(PALETTE_STORAGE_KEY) ?? "original";
    setSelectedPalette(savedPalette);
    document.documentElement.setAttribute("data-theme", savedPalette);
  }, []);

  const handlePaletteChange = (palette: string) => {
    setSelectedPalette(palette);
    document.documentElement.setAttribute("data-theme", palette);
    localStorage.setItem(PALETTE_STORAGE_KEY, palette);
  };

  if (!isMounted) return null;

  return (
    <Card className="rounded-2xl shadow-sm border-border">
      <CardHeader>
        <CardTitle>Apariencia</CardTitle>
        <CardDescription>
          Elige el modo de color y la paleta principal de la aplicación.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8 pb-6">
        <div className="space-y-3">
          <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground block">
            Modo
          </Label>
          <div className="flex flex-wrap gap-3">
            {colorModes.map((mode) => (
              <Button
                key={mode.value}
                variant={theme === mode.value ? "default" : "outline"}
                onClick={() => setTheme(mode.value)}
                className="rounded-xl font-bold h-11 px-6"
              >
                {mode.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground block">
            Paleta
          </Label>

          <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-4 pr-4 sm:grid sm:grid-cols-2 sm:overflow-visible sm:pb-0 sm:pr-0 lg:grid-cols-3 scrollbar-hide">
            {themesList.map((palette) => {
              const paletteKey = palette.value as keyof typeof palettePreview;
              const preview = palettePreview[paletteKey][previewMode];

              return (
                <Button
                  key={palette.value}
                  variant="outline"
                  onClick={() => handlePaletteChange(palette.value)}
                  className={`h-auto w-[80%] shrink-0 snap-start flex-col items-stretch justify-start p-4 rounded-2xl font-normal transition-all sm:w-auto sm:shrink sm:snap-none ${
                    selectedPalette === palette.value
                      ? "border-primary bg-accent/50 ring-2 ring-primary/25 shadow-sm"
                      : "hover:bg-accent/30"
                  }`}
                >
                  <p className="mb-3 text-left text-sm font-bold w-full">
                    {palette.label}
                  </p>

                  <div
                    className="rounded-xl border p-3 shadow-sm transition-colors w-full"
                    style={{
                      borderColor: preview.accent,
                      backgroundColor: preview.background,
                    }}
                  >
                    <div className="mb-3 flex items-center gap-2">
                      <span
                        className="h-3 w-3 rounded-full shadow-sm"
                        style={{ backgroundColor: preview.primary }}
                      />
                      <span
                        className="h-3 w-3 rounded-full shadow-sm"
                        style={{ backgroundColor: preview.accent }}
                      />
                      <span
                        className="h-3 w-3 rounded-full border border-border"
                        style={{ backgroundColor: preview.card }}
                      />
                    </div>

                    <div
                      className="rounded-lg p-2.5 transition-colors flex flex-col items-start shadow-sm border border-black/5 dark:border-white/5"
                      style={{ backgroundColor: preview.card }}
                    >
                      <p
                        className="text-[11px] font-bold tracking-wide uppercase"
                        style={{ color: preview.foreground }}
                      >
                        Vista previa
                      </p>
                      <p
                        className="text-[10px] mt-1 font-medium"
                        style={{ color: preview.muted }}
                      >
                        Texto secundario
                      </p>
                    </div>
                  </div>
                </Button>
              );
            })}
          </div>

          <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
            La vista previa se adapta al modo actual (
            {previewMode === "dark" ? "oscuro" : "claro"}).
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
