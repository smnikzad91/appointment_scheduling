import Link from "next/link";
import { ArrowRight } from "lucide-react";
import GuestLogo from "./GuestLogo";
import { rise } from "./motion";

/**
 * Frosted card every auth screen sits in. Children get their own `g-rise` + `rise(n)` for the
 * stagger; numbering from 3 continues after the card's heading.
 */
export default function AuthCard({
  title,
  subtitle,
  children,
  footer,
  wide,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={`w-full ${wide ? "max-w-lg" : "max-w-md"}`}>
      <div className="g-rise mb-6 flex items-center justify-between" style={rise(0)}>
        <GuestLogo className="lg:invisible" />
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-g-muted transition hover:bg-white/5 hover:text-g-ink"
        >
          <ArrowRight className="h-4 w-4" aria-hidden />
          بازگشت به سایت
        </Link>
      </div>

      <section className="g-glass g-glow-border g-rise rounded-[28px] p-6 sm:p-8" style={rise(1)}>
        <header className="mb-7">
          <h1 className="g-rise text-[26px] font-black leading-tight text-g-ink" style={rise(2)}>
            {title}
          </h1>
          {subtitle && (
            <p className="g-rise mt-2 text-sm leading-7 text-g-muted" style={rise(2.5)}>
              {subtitle}
            </p>
          )}
        </header>
        {children}
      </section>

      {footer && (
        <p className="g-rise mt-6 text-center text-sm text-g-muted" style={rise(9)}>
          {footer}
        </p>
      )}
    </div>
  );
}

export function AuthLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="font-bold text-g-accent underline-offset-4 transition hover:text-g-accent-3 hover:underline">
      {children}
    </Link>
  );
}
