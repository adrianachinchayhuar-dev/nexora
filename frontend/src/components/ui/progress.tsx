import { cn } from "@/lib/utils";

interface ProgressProps {
  value: number;
  max: number;
  className?: string;
  barClassName?: string;
  label?: string;
}

/** Barra de avance accesible (avance hacia el mínimo de la compra). */
function Progress({ value, max, className, barClassName, label }: ProgressProps) {
  const pct = max <= 0 ? 0 : Math.min(100, Math.round((value / max) * 100));
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-label={label}
      className={cn("h-2.5 w-full overflow-hidden rounded-full bg-muted", className)}
    >
      <div className={cn("h-full rounded-full bg-primary transition-all", barClassName)} style={{ width: `${pct}%` }} />
    </div>
  );
}

export { Progress };
