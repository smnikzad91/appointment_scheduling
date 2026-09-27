import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { twMerge } from "tailwind-merge";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

const base =
  "group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-lg font-semibold transition-all duration-200 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-900 disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100";

const variants: Record<Variant, string> = {
  primary:
    "bg-gradient-to-r from-brand-500 to-theme-purple-500 bg-[length:160%_100%] bg-right text-white shadow-md shadow-brand-500/25 hover:-translate-y-0.5 hover:bg-left hover:shadow-lg hover:shadow-brand-500/40 active:translate-y-0 active:shadow-md",
  secondary:
    "border border-gray-300 bg-white text-gray-700 hover:border-gray-400 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-gray-600 dark:hover:bg-gray-800",
  ghost:
    "text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-500/10",
};

const sizes: Record<Size, string> = {
  sm: "px-3.5 py-2 text-sm",
  md: "px-5 py-2.5 text-sm",
  lg: "px-8 py-3.5 text-base",
};

interface CommonProps {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  startIcon?: ReactNode;
  endIcon?: ReactNode;
  className?: string;
  children: ReactNode;
}

type ButtonAsButton = CommonProps &
  ButtonHTMLAttributes<HTMLButtonElement> & {
    href?: undefined;
  };

type ButtonAsLink = CommonProps &
  AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
    external?: boolean;
  };

export type ButtonProps = ButtonAsButton | ButtonAsLink;

export function Button(props: ButtonProps) {
  const {
    variant = "primary",
    size = "md",
    loading = false,
    startIcon,
    endIcon,
    className,
    children,
    ...rest
  } = props;

  const classes = twMerge(base, variants[variant], sizes[size], className);
  const content = (
    <>
      {variant === "primary" && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full"
        />
      )}
      <span className="relative inline-flex items-center gap-2">
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          startIcon
        )}
        {children}
        {!loading && endIcon}
      </span>
    </>
  );

  if ("href" in props && props.href) {
    const { href, external, ...anchorRest } = rest as Omit<
      ButtonAsLink,
      keyof CommonProps
    >;
    return (
      <Link
        href={href}
        className={classes}
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        {...anchorRest}
      >
        {content}
      </Link>
    );
  }

  const { disabled, ...buttonRest } = rest as Omit<
    ButtonAsButton,
    keyof CommonProps
  >;

  return (
    <button
      className={classes}
      disabled={disabled || loading}
      {...buttonRest}
    >
      {content}
    </button>
  );
}
