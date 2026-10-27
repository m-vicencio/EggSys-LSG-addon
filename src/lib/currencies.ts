// Lista de monedas soportadas en la app (fuente única de verdad)
export const CURRENCIES = [
  { code: "CLP", label: "CLP – Peso Chileno" },
  { code: "USD", label: "USD – Dólar" },
  { code: "EUR", label: "EUR – Euro" },
  { code: "ARS", label: "ARS – Peso Argentino" },
  { code: "MXN", label: "MXN – Peso Mexicano" },
  { code: "BRL", label: "BRL – Real Brasileño" },
  { code: "PEN", label: "PEN – Sol Peruano" },
  { code: "COP", label: "COP – Peso Colombiano" },
] as const;

// Set derivado para validación y lookup O(1)
export const CURRENCY_CODES: Set<string> = new Set(
  CURRENCIES.map((c) => c.code),
);
