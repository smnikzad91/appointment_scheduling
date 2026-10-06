import type { Metadata } from "next";
import SetPasswordForm from "@/components/auth/SetPasswordForm";

// Opened from the one-time link a salon owner shares with a new stylist.
export const metadata: Metadata = {
  title: "تعیین رمز عبور",
  robots: { index: false, follow: false },
};

export default async function SetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <SetPasswordForm token={token} />;
}
