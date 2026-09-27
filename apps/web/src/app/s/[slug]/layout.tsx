import { vazirmatn } from "@/fonts/vazirmatn";

export default function SalonLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${vazirmatn.variable} min-h-screen bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-50`}
      style={{ fontFamily: "var(--font-vazirmatn-salon), sans-serif" }}
    >
      {children}
    </div>
  );
}
