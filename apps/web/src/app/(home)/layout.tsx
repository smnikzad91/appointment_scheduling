export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div dir="rtl" className="font-vazirmatn min-h-screen bg-[#f7f0e8]">
      {children}
    </div>
  );
}
