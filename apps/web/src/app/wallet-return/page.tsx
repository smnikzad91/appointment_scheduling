import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { usesSalonPanel } from "@/lib/roles";

// «بازگشت» on nodepass.ir's payment page for a top-up started in the Android app (lib/topUps.ts
// WALLET_PATHS). The app opens this link itself (its wallet); in a browser it lands on the account's wallet page.

export const dynamic = "force-dynamic";

export default async function WalletReturnPage() {
  const role = (await auth())?.user.role;
  if (!role) redirect("/signin");
  if (usesSalonPanel(role)) redirect("/salon/wallet");
  if (role === "STYLIST") redirect("/stylist/wallet");
  redirect("/dashboard/finance");
}
