export default function MyBookingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div dir="rtl" className="font-vazirmatn min-h-screen bg-gray-50 dark:bg-gray-950">
      {children}
    </div>
  );
}
