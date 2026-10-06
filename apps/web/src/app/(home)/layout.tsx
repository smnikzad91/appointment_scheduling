import GuestBackdrop from "@/components/guest/GuestBackdrop";
import GuestTabBar from "@/components/guest/GuestTabBar";

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div dir="rtl" className="app-root guest-root min-h-screen overflow-x-clip">
      <GuestBackdrop />
      {children}
      <GuestTabBar />
    </div>
  );
}
