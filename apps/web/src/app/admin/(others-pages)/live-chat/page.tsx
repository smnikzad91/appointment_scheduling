import { Metadata } from "next";
import AdminLiveChat from "@/components/admin/AdminLiveChat";

export const metadata: Metadata = { title: "Live chat | Admin" };

export default function LiveChatPage() {
  return <AdminLiveChat />;
}
