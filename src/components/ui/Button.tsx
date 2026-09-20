import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "outline" | "danger";
type Size = "sm" | "md" | "lg";
const variants: Record<Variant, string> = {
  primary: "btn-primary hover-sheen",
  secondary: "btn-secondary",
  ghost: "btn-ghost",
  outline: "btn-outline",
  danger: "btn bg-danger-soft text-danger border border-danger/20 hover:bg-danger hover:text-white hover:border-danger hover:shadow-rose",
};
const sizes: Record<Size, string> = { 
  sm: "px-3 py-1.5 text-xs rounded-lg", 
  md: "px-4 py-2.5 text-sm rounded-xl", 
  lg: "px-6 py-3.5 text-base rounded-xl font-bold" 
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> { variant?: Variant; size?: Size; loading?: boolean }

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading, className, children, disabled, ...rest }, ref) {
  return (
    <button ref={ref} className={cn(variants[variant], sizes[size], className)} disabled={disabled || loading} {...rest}>
      {loading && <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" aria-hidden />}
      {children}
    </button>
  );
});

