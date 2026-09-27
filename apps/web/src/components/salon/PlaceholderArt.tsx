import { ImageIcon } from "lucide-react";

/** Deterministic gradient placeholder for photos the salon hasn't uploaded yet. */
export default function PlaceholderArt({ seed, className = "" }: { seed: string; className?: string }) {
  const hue = Math.abs(hashCode(seed)) % 360;

  return (
    <div
      className={`flex items-center justify-center ${className}`}
      style={{
        background: `linear-gradient(135deg, hsl(${hue} 70% 88%), hsl(${(hue + 40) % 360} 70% 78%))`,
      }}
      role="img"
      aria-label="تصویر نمونه"
    >
      <ImageIcon className="h-8 w-8 text-white/70" aria-hidden />
    </div>
  );
}

function hashCode(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}
