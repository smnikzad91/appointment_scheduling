/**
 * Separator between inline facts ("۴۵ دقیقه | ۳۵۰,۰۰۰ تومان"). Don't use "·": in Vazirmatn the
 * middle dot is nearly identical to the Persian zero "۰", so "۴ · نمونه" reads as "۴۰" and a price
 * next to it gains a zero. This draws a thin bar instead, with a "،" for screen readers.
 */
export default function Sep({ className }: { className?: string }) {
  return (
    <>
      <span aria-hidden className={`mx-1.5 inline-block h-[0.9em] w-px bg-current align-[-0.1em] opacity-35 ${className ?? ""}`} />
      <span className="sr-only">، </span>
    </>
  );
}
