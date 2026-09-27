import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { StylistShell } from "@/components/app/panels";

export default async function StylistLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  // proxy.ts already guards /stylist/*, but check again here for the same reason
  // apps/salon/layout.tsx does.
  if (!session || session.user.role !== "STYLIST") {
    redirect("/signin");
  }

  return <StylistShell>{children}</StylistShell>;
}
