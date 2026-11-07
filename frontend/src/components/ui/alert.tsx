import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const alertVariants = cva("relative flex w-full gap-3 rounded-2xl border p-4 text-sm [&>svg]:mt-0.5 [&>svg]:size-5 [&>svg]:shrink-0", {
  variants: {
    variant: {
      default: "bg-card",
      info: "border-transparent bg-info-suave text-info",
      exito: "border-transparent bg-exito-suave text-exito",
      aviso: "border-transparent bg-aviso-suave text-[#7a4a05]",
      naranja: "border-transparent bg-naranja-suave text-naranja-tinta",
      destructive: "border-transparent bg-destructive/10 text-destructive",
      lila: "border-transparent bg-secondary text-secondary-foreground",
    },
  },
  defaultVariants: { variant: "default" },
});

const Alert = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>>(
  ({ className, variant, ...props }, ref) => <div ref={ref} role="status" className={cn(alertVariants({ variant }), className)} {...props} />,
);
Alert.displayName = "Alert";

export { Alert };
