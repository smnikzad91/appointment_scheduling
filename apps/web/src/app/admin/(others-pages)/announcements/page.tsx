import { Metadata } from "next";
import AdminAnnouncements from "@/components/admin/AdminAnnouncements";

export const metadata: Metadata = { title: "Announcements | Admin" };

export default function AnnouncementsPage() {
  return <AdminAnnouncements />;
}
