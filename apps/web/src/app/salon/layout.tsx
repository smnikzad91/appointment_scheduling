import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SalonShell } from "@/components/app/panels";

export default async function SalonOwnerLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  // proxy.ts already guards /salon/*, but a Server Component can render before
  // middleware redirects finish propagating in some edge cases — check again here.
  if (!session || session.user.role !== "SALON_OWNER") {
    redirect("/signin");
  }

  return <SalonShell>{children}</SalonShell>;
}
