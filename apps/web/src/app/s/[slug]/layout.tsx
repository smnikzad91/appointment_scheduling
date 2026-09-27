
export default function SalonLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`min-h-screen bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-50`}
      style={{ fontFamily: "Vazirmatn, Tahoma, sans-serif" }}
    >
      {children}
    </div>
  );
}
