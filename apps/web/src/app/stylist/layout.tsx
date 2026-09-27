import { redirect } from "next/navigation";
import { auth } from "@/auth";
import StylistSidebar from "@/components/stylist-dashboard/StylistSidebar";
import PanelThemeStyle from "@/components/theme/PanelThemeStyle";

export default async function StylistLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  // proxy.ts already guards /stylist/*, but check again here for the same reason
  // apps/salon/layout.tsx does.
  if (!session || session.user.role !== "STYLIST") {
    redirect("/signin");
  }

  return (
    <div dir="rtl" className="panel-root-theme font-vazirmatn min-h-screen bg-gray-50 dark:bg-gray-950">
      <PanelThemeStyle />
      <StylistSidebar />
      <main className="min-h-screen overflow-y-auto px-4 pb-20 pt-16">{children}</main>
    </div>
  );
}
