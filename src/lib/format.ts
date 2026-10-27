/**
 * Formatea un número como pesos chilenos (CLP) sin decimales.
 * Ejemplo: 1234567 → "$1.234.567"
 */

export const formatCLP = (value: string | number) => {
  const strVal = String(value).replace(/\D/g, ""); // Elimina todo lo que no sea dígito
  if (!strVal) return "";
  return new Intl.NumberFormat("es-CL").format(Number(strVal));
};

export const sanitizeCLP = (value: string) => {
  return value.replace(/\D/g, ""); // Guarda el valor crudo solo con números
};

export const MAX_MONEY_DIGITS = 10;
export const MAX_MONEY_AMOUNT = 9_999_999_999;

export function sanitizeMoneyInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, MAX_MONEY_DIGITS);

  if (!digits) return "";

  const parsed = Number.parseInt(digits, 10);
  return String(Math.min(parsed, MAX_MONEY_AMOUNT));
}

export function formatMoneyPreview(raw: string): string | null {
  const sanitized = sanitizeMoneyInput(raw);
  if (!sanitized) return null;

  const parsed = Number.parseInt(sanitized, 10);
  return Number.isNaN(parsed) ? null : parsed.toLocaleString("es-CL");
}
