import { cn } from "../../lib/utils";

const variantClasses = {
  primary:
    "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-blue-800 focus:ring-blue-200",
  secondary:
    "border border-[hsl(var(--border))] bg-white text-[hsl(var(--secondary-foreground))] hover:bg-[hsl(var(--secondary))] focus:ring-slate-200",
  family:
    "bg-[hsl(var(--family))] text-[hsl(var(--family-foreground))] hover:bg-violet-800 focus:ring-violet-200",
  destructive:
    "bg-[hsl(var(--destructive))] text-[hsl(var(--destructive-foreground))] hover:bg-rose-700 focus:ring-rose-200",
  ghost:
    "bg-transparent text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary))] focus:ring-slate-200",
};

const sizeClasses = {
  default: "min-h-12 px-5 text-base",
  large: "min-h-16 px-6 text-xl",
  icon: "h-12 w-12 px-0",
};

export function Button({
  children,
  className = "",
  size = "default",
  variant = "primary",
  ...props
}) {
  return (
    <button
      className={cn(
        "inline-flex w-full items-center justify-center gap-2 rounded-lg font-black tracking-normal transition focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      type="button"
      {...props}
    >
      {children}
    </button>
  );
}
