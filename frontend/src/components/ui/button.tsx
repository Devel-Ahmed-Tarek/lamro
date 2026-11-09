import Link from "next/link";
import { cn } from "@/components/ui/cn";

const variants = {
  primary: "border-ink bg-ink text-white shadow-[0_1px_2px_rgba(18,18,18,0.08),0_8px_16px_-12px_rgba(18,18,18,0.4)] hover:-translate-y-px hover:border-copper hover:shadow-[0_10px_22px_-12px_rgba(255,77,0,0.55)]",
  accent: "border-transparent bg-accent-gradient text-white shadow-[0_8px_18px_-10px_rgba(255,77,0,0.7)] hover:-translate-y-px hover:brightness-105 hover:shadow-[0_14px_26px_-12px_rgba(255,77,0,0.75)]",
  secondary: "border-line bg-white text-ink shadow-[0_1px_2px_rgba(18,18,18,0.06),0_8px_16px_-12px_rgba(18,18,18,0.35)] hover:-translate-y-px hover:border-copper/50 hover:text-copper hover:shadow-[0_10px_22px_-12px_rgba(255,77,0,0.55)]",
  ghost: "border-transparent bg-transparent text-ink hover:-translate-y-px hover:border-line hover:bg-white hover:text-copper hover:shadow-[0_8px_16px_-12px_rgba(18,18,18,0.35)]",
  danger: "border-danger/30 bg-white text-danger shadow-sm hover:-translate-y-px hover:border-danger hover:bg-danger/5 hover:shadow-md",
} as const;

const sizes = {
  sm: "h-9 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-11 px-5 text-sm",
  icon: "h-10 w-10",
} as const;

export type ButtonVariant = keyof typeof variants;
export type ButtonSize = keyof typeof sizes;

export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-full border font-medium transition duration-150 disabled:pointer-events-none disabled:opacity-50",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-copper",
    variants[variant],
    sizes[size],
    className,
  );
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function Button({ variant = "primary", size = "md", className, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={buttonClass(variant, size, className)} {...props} />;
}

type ButtonLinkProps = React.ComponentProps<typeof Link> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function ButtonLink({ variant = "primary", size = "md", className, ...props }: ButtonLinkProps) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}
