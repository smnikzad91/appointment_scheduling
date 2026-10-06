import { Metadata } from "next";
import AdminAnalytics from "@/components/admin/AdminAnalytics";

export const metadata: Metadata = { title: "Analytics | Admin" };

export default function AdminAnalyticsPage() {
  return <AdminAnalytics />;
}
