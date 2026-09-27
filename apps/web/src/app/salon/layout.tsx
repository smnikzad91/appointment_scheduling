import { redirect } from "next/navigation";
import { auth } from "@/auth";
import SalonOwnerSidebar from "@/components/salon-dashboard/SalonOwnerSidebar";
import PanelThemeStyle from "@/components/theme/PanelThemeStyle";

export default async function SalonOwnerLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  // proxy.ts already guards /salon/*, but a Server Component can render before
  // middleware redirects finish propagating in some edge cases — check again here.
  if (!session || session.user.role !== "SALON_OWNER") {
    redirect("/signin");
  }

  return (
    <div dir="rtl" className="panel-root-theme font-vazirmatn min-h-screen bg-gray-50 dark:bg-gray-950">
      <PanelThemeStyle />
      <SalonOwnerSidebar />
      <main className="min-h-screen overflow-y-auto px-4 pb-20 pt-16">{children}</main>
    </div>
  );
}
