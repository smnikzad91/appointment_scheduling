import GuestBackdrop from "@/components/guest/GuestBackdrop";

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div dir="rtl" className="app-root guest-root min-h-screen overflow-x-clip">
      <GuestBackdrop />
      {children}
    </div>
  );
}
