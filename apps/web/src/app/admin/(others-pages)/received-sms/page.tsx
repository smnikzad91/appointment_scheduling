import { Metadata } from "next";
import AdminReceivedSms from "@/components/admin/AdminReceivedSms";

export const metadata: Metadata = { title: "Received SMS | Admin" };

export default function ReceivedSmsPage() {
  return <AdminReceivedSms />;
}
