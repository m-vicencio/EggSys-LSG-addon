import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type SummaryVariant = "default" | "danger" | "muted" | "success";

const iconVariantClasses: Record<SummaryVariant, string> = {
  default: "bg-primary/10 text-primary border-primary/20",
  danger: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  muted: "bg-muted/50 text-muted-foreground border-border/50",
  success:
    "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
};

const cardVariantClasses: Record<SummaryVariant, string> = {
  default: "border-border hover:border-primary/30",
  danger: "border-red-500/20 bg-red-500/5",
  muted: "border-border/50 bg-muted/10",
  success: "border-emerald-500/20 bg-emerald-500/5",
};

interface SummaryCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  variant?: SummaryVariant;
  className?: string;
}

export function SummaryCard({
  icon,
  label,
  value,
  variant = "default",
  className = "",
}: SummaryCardProps) {
  return (
    <Card
      className={cn(
        "overflow-hidden transition-all duration-300 rounded-2xl shadow-sm",
        cardVariantClasses[variant],
        className,
      )}
    >
      <CardContent className="p-5 flex flex-col gap-3">
        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border",
            iconVariantClasses[variant],
          )}
        >
          <div className="[&>svg]:h-5 [&>svg]:w-5">{icon}</div>
        </div>

        <div className="space-y-1">
          <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground block truncate">
            {label}
          </div>
          <div className="text-2xl font-bold truncate tracking-tight text-foreground">
            {value}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
