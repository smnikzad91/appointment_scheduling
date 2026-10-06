import { Metadata } from "next";
import AdminPricing from "@/components/admin/AdminPricing";

export const metadata: Metadata = { title: "Pricing | Admin" };

export default function PricingAdminPage() {
  return <AdminPricing />;
}
