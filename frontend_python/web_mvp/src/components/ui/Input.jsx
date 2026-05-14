import { cn } from "../../lib/utils";

export function Input({ className = "", type = "text", ...props }) {
  return (
    <input
      className={cn(
        "flex min-h-12 w-full rounded-lg border-2 border-[hsl(var(--input))] bg-white px-4 py-3 text-base text-[hsl(var(--foreground))] transition placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      type={type}
      {...props}
    />
  );
}

export function Textarea({ className = "", ...props }) {
  return (
    <textarea
      className={cn(
        "flex min-h-48 w-full resize-y rounded-lg border-2 border-[hsl(var(--input))] bg-white px-4 py-3 text-base leading-7 text-[hsl(var(--foreground))] transition placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
