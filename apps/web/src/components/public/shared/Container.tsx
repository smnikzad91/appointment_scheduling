import type { ReactNode } from "react";

const sizes = {
  sm: "max-w-2xl",
  md: "max-w-3xl",
  lg: "max-w-6xl",
  xl: "max-w-7xl",
} as const;

interface ContainerProps {
  children: ReactNode;
  size?: keyof typeof sizes;
  className?: string;
}

export function Container({ children, size = "xl", className }: ContainerProps) {
  return (
    <div className={`mx-auto px-4 sm:px-6 lg:px-8 ${sizes[size]} ${className ?? ""}`}>
      {children}
    </div>
  );
}
