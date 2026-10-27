import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { CURRENCY_CODES } from "@/lib/currencies";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatCurrency = (val: number, currency = "CLP") => {
  // Normalizar y validar código contra la lista única de monedas soportadas
  const safeCurrency = CURRENCY_CODES.has(currency) ? currency : "CLP";
  try {
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: safeCurrency,
      currencyDisplay: "narrowSymbol",
    }).format(val);
  } catch {
    // Fallback seguro
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      currencyDisplay: "narrowSymbol",
    }).format(val);
  }
};

export const formatDate = (dateStr: string) =>
  new Intl.DateTimeFormat("es-CL", { day: "numeric", month: "short" }).format(
    new Date(dateStr),
  );
