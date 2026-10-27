import {
  AlertTriangleIcon,
  BanknoteIcon,
  BriefcaseIcon,
  BuildingIcon,
  CarIcon,
  CreditCardIcon,
  DogIcon,
  DollarSignIcon,
  Gamepad2Icon,
  GiftIcon,
  GraduationCapIcon,
  HammerIcon,
  HandCoinsIcon,
  HeartPulseIcon,
  HelpCircleIcon,
  HomeIcon,
  LandmarkIcon,
  LaptopIcon,
  PercentIcon,
  PlaneIcon,
  ReceiptIcon,
  ShieldCheckIcon,
  ShirtIcon,
  ShoppingBagIcon,
  SmartphoneIcon,
  SparklesIcon,
  TrendingUpIcon,
  TvIcon,
  UsersIcon,
  UtensilsIcon,
  ZapIcon,
} from "lucide-react";

type CategoryType = "INCOME" | "EXPENSE";

export const CATEGORY_ICON_OPTIONS = [
  { name: "UtensilsIcon", label: "Alimentación", icon: UtensilsIcon },
  { name: "HomeIcon", label: "Vivienda", icon: HomeIcon },
  { name: "CarIcon", label: "Transporte", icon: CarIcon },
  { name: "HeartPulseIcon", label: "Salud", icon: HeartPulseIcon },
  { name: "Gamepad2Icon", label: "Ocio", icon: Gamepad2Icon },
  {
    name: "GraduationCapIcon",
    label: "Educación",
    icon: GraduationCapIcon,
  },
  { name: "TrendingUpIcon", label: "Ahorro", icon: TrendingUpIcon },
  { name: "HelpCircleIcon", label: "Otros", icon: HelpCircleIcon },
  { name: "DollarSignIcon", label: "Ingresos", icon: DollarSignIcon },
  { name: "BanknoteIcon", label: "Dinero", icon: BanknoteIcon },
  { name: "BriefcaseIcon", label: "Trabajo", icon: BriefcaseIcon },
  { name: "BuildingIcon", label: "Edificio", icon: BuildingIcon },
  { name: "CreditCardIcon", label: "Tarjeta", icon: CreditCardIcon },
  { name: "DogIcon", label: "Mascotas", icon: DogIcon },
  { name: "GiftIcon", label: "Regalos", icon: GiftIcon },
  { name: "HammerIcon", label: "Hogar", icon: HammerIcon },
  { name: "HandCoinsIcon", label: "Préstamos", icon: HandCoinsIcon },
  { name: "LandmarkIcon", label: "Banco", icon: LandmarkIcon },
  { name: "LaptopIcon", label: "Tecnología", icon: LaptopIcon },
  { name: "PercentIcon", label: "Descuentos", icon: PercentIcon },
  { name: "PlaneIcon", label: "Viajes", icon: PlaneIcon },
  { name: "ReceiptIcon", label: "Recibos", icon: ReceiptIcon },
  { name: "ShieldCheckIcon", label: "Seguros", icon: ShieldCheckIcon },
  { name: "ShirtIcon", label: "Vestimenta", icon: ShirtIcon },
  { name: "ShoppingBagIcon", label: "Compras", icon: ShoppingBagIcon },
  { name: "SmartphoneIcon", label: "Apps", icon: SmartphoneIcon },
  { name: "SparklesIcon", label: "Cuidado", icon: SparklesIcon },
  { name: "TvIcon", label: "Streaming", icon: TvIcon },
  { name: "UsersIcon", label: "Familia", icon: UsersIcon },
  { name: "ZapIcon", label: "Servicios", icon: ZapIcon },
  { name: "AlertTriangleIcon", label: "Emergencias", icon: AlertTriangleIcon },
] as const;

export type CategoryIconName = (typeof CATEGORY_ICON_OPTIONS)[number]["name"];

export type CategoryMetaSource =
  | string
  | {
      name?: string | null;
      label?: string | null;
      category?: string | null;
      iconName?: string | null;
      color?: string | null;
    };

export const DEFAULT_CATEGORY_TEMPLATES = [
  {
    name: "Alimentación",
    type: "EXPENSE" as CategoryType,
    iconName: "UtensilsIcon" as const,
    color: "#f97316",
  },
  {
    name: "Vivienda",
    type: "EXPENSE" as CategoryType,
    iconName: "HomeIcon" as const,
    color: "#ef4444",
  },
  {
    name: "Transporte",
    type: "EXPENSE" as CategoryType,
    iconName: "CarIcon" as const,
    color: "#3b82f6",
  },
  {
    name: "Salud y cuidado",
    type: "EXPENSE" as CategoryType,
    iconName: "HeartPulseIcon" as const,
    color: "#10b981",
  },
  {
    name: "Ocio y entretenimiento",
    type: "EXPENSE" as CategoryType,
    iconName: "Gamepad2Icon" as const,
    color: "#f43f5e",
  },
  {
    name: "Educación",
    type: "EXPENSE" as CategoryType,
    iconName: "GraduationCapIcon" as const,
    color: "#8b5cf6",
  },
  {
    name: "Ahorro",
    type: "EXPENSE" as CategoryType,
    iconName: "TrendingUpIcon" as const,
    color: "#14b8a6",
  },
  {
    name: "Otros",
    type: "EXPENSE" as CategoryType,
    iconName: "HelpCircleIcon" as const,
    color: "#64748b",
  },
  {
    name: "Salario",
    type: "INCOME" as CategoryType,
    iconName: "DollarSignIcon" as const,
    color: "#10b981",
  },
  {
    name: "Préstamo",
    type: "INCOME" as CategoryType,
    iconName: "HandCoinsIcon" as const,
    color: "#6366f1",
  },
  {
    name: "Bonos",
    type: "INCOME" as CategoryType,
    iconName: "BanknoteIcon" as const,
    color: "#22c55e",
  },
  {
    name: "Ventas",
    type: "INCOME" as CategoryType,
    iconName: "ShoppingBagIcon" as const,
    color: "#f59e0b",
  },
  {
    name: "Otros",
    type: "INCOME" as CategoryType,
    iconName: "HelpCircleIcon" as const,
    color: "#64748b",
  },
] as const;

const categoryIconMap = new Map(
  CATEGORY_ICON_OPTIONS.map((option) => [option.name, option.icon]),
);

export function getCategoryIcon(iconName?: string | null) {
  if (!iconName) return HelpCircleIcon;
  return categoryIconMap.get(iconName as CategoryIconName) ?? HelpCircleIcon;
}

export const CATEGORIES = [
  // ── EGRESOS (EXPENSE) ──
  {
    id: "Alimentación",
    label: "Alimentación",
    icon: UtensilsIcon,
    color: "#f97316",
  },
  { id: "Casa", label: "Casa", icon: HomeIcon, color: "#ef4444" },
  { id: "Servicios", label: "Servicios", icon: ZapIcon, color: "#eab308" },
  { id: "Transporte", label: "Transporte", icon: CarIcon, color: "#3b82f6" },
  { id: "Salud", label: "Salud", icon: HeartPulseIcon, color: "#10b981" },
  {
    id: "Educación",
    label: "Educación",
    icon: GraduationCapIcon,
    color: "#8b5cf6",
  },
  { id: "Vestimenta", label: "Vestimenta", icon: ShirtIcon, color: "#ec4899" },
  {
    id: "Cuidado Personal",
    label: "Cuidado Personal",
    icon: SparklesIcon,
    color: "#d946ef",
  },
  { id: "Ocio", label: "Ocio", icon: Gamepad2Icon, color: "#f43f5e" },
  {
    id: "Suscripciones",
    label: "Suscripciones",
    icon: TvIcon,
    color: "#6366f1",
  },
  { id: "Mascotas", label: "Mascotas", icon: DogIcon, color: "#a855f7" },
  { id: "Familia", label: "Familia", icon: UsersIcon, color: "#0ea5e9" },
  {
    id: "Regalos y Donaciones",
    label: "Regalos y Donaciones",
    icon: GiftIcon,
    color: "#f43f5e",
  },
  { id: "Viajes", label: "Viajes", icon: PlaneIcon, color: "#06b6d4" },
  { id: "Deudas", label: "Deudas", icon: CreditCardIcon, color: "#475569" },
  { id: "Seguros", label: "Seguros", icon: ShieldCheckIcon, color: "#059669" },
  {
    id: "Gastos Financieros",
    label: "Gastos Financieros",
    icon: BanknoteIcon,
    color: "#64748b",
  },
  {
    id: "Inversiones",
    label: "Inversiones",
    icon: TrendingUpIcon,
    color: "#22c55e",
  },
  {
    id: "Mantenimiento Hogar",
    label: "Mantenimiento Hogar",
    icon: HammerIcon,
    color: "#78350f",
  },
  { id: "Impuestos", label: "Impuestos", icon: LandmarkIcon, color: "#4b5563" },
  { id: "Tecnología", label: "Tecnología", icon: LaptopIcon, color: "#1e293b" },
  {
    id: "Emergencias",
    label: "Emergencias",
    icon: AlertTriangleIcon,
    color: "#dc2626",
  },

  // ── INGRESOS (INCOME) ──
  { id: "Salario", label: "Salario", icon: DollarSignIcon, color: "#10b981" },
  {
    id: "Freelance",
    label: "Freelance",
    icon: BriefcaseIcon,
    color: "#0ea5e9",
  },
  { id: "Ventas", label: "Ventas", icon: ShoppingBagIcon, color: "#f59e0b" },
  {
    id: "Inversiones_Inc",
    label: "Inversiones",
    icon: TrendingUpIcon,
    color: "#22c55e",
  },
  {
    id: "Bonos y Aguinaldos",
    label: "Bonos y Aguinaldos",
    icon: BanknoteIcon,
    color: "#10b981",
  },
  {
    id: "Reembolsos",
    label: "Reembolsos",
    icon: ReceiptIcon,
    color: "#64748b",
  },
  { id: "Arriendos", label: "Arriendos", icon: BuildingIcon, color: "#8b5cf6" },
  { id: "Regalos", label: "Regalos", icon: GiftIcon, color: "#f43f5e" },
  { id: "Subsidios", label: "Subsidios", icon: LandmarkIcon, color: "#06b6d4" },
  {
    id: "Préstamos",
    label: "Préstamos",
    icon: HandCoinsIcon,
    color: "#6366f1",
  },
  {
    id: "Economía Colaborativa",
    label: "Economía Colaborativa",
    icon: SmartphoneIcon,
    color: "#f97316",
  },
  { id: "Cashback", label: "Cashback", icon: PercentIcon, color: "#10b981" },

  // ── COMPARTIDO / OTROS ──
  { id: "Otros", label: "Otros", icon: HelpCircleIcon, color: "#64748b" },
];

export function getCategoryMeta(category?: CategoryMetaSource) {
  const fallback = CATEGORIES.find((category) => category.id === "Otros") ?? {
    id: "Otros",
    label: "Otros",
    icon: HelpCircleIcon,
    color: "#64748b",
  };

  if (!category) return fallback;

  if (typeof category === "string") {
    const lowerName = category.toLowerCase();
    const found = CATEGORIES.find(
      (entry) =>
        entry.id.toLowerCase() === lowerName ||
        entry.label.toLowerCase() === lowerName,
    );

    return found ?? fallback;
  }

  const label =
    category.name?.trim() ??
    category.label?.trim() ??
    category.category?.trim();
  const found = label
    ? CATEGORIES.find(
        (entry) =>
          entry.id.toLowerCase() === label.toLowerCase() ||
          entry.label.toLowerCase() === label.toLowerCase(),
      )
    : undefined;

  if (category.iconName || category.color) {
    return {
      ...(found ?? fallback),
      label: label || found?.label || fallback.label,
      icon: getCategoryIcon(category.iconName),
      color: category.color || found?.color || fallback.color,
    };
  }

  return found ?? fallback;
}
