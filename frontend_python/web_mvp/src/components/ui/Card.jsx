import { cn } from "../../lib/utils";

export function Card({ as: Component = "div", className = "", ...props }) {
  return (
    <Component
      className={cn(
        "rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--card-foreground))] shadow-[var(--shadow-card)]",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className = "", ...props }) {
  return <div className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />;
}

export function CardTitle({ className = "", ...props }) {
  return <h3 className={cn("text-2xl font-black leading-none tracking-normal", className)} {...props} />;
}

export function CardDescription({ className = "", ...props }) {
  return <p className={cn("text-sm leading-6 text-[hsl(var(--muted-foreground))]", className)} {...props} />;
}

export function CardContent({ className = "", ...props }) {
  return <div className={cn("p-6 pt-0", className)} {...props} />;
}

export function CardFooter({ className = "", ...props }) {
  return <div className={cn("flex items-center p-6 pt-0", className)} {...props} />;
}
