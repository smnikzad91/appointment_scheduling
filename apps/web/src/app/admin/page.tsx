import type { Metadata } from "next";
import AdminOverview from "@/components/admin/AdminOverview";
import AdminErrorLog from "@/components/admin/AdminErrorLog";

export const metadata: Metadata = {
  title: "داشبورد مدیریت",
};

export default function AdminDashboardPage() {
  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <AdminOverview />
      <AdminErrorLog />
    </div>
  );
}
