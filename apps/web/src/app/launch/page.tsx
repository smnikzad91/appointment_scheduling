import { redirect } from "next/navigation";
import { auth } from "@/auth";

// Start URL of the installed app: send each role straight to its own panel.
const HOME_BY_ROLE: Record<string, string> = {
  SALON_OWNER: "/salon",
  INDEPENDENT_STYLIST: "/salon",
  STYLIST: "/stylist",
  PLATFORM_ADMIN: "/admin",
  CUSTOMER: "/dashboard",
};

export default async function LaunchPage() {
  const session = await auth();
  redirect(session ? (HOME_BY_ROLE[session.user.role] ?? "/dashboard") : "/signin");
}
