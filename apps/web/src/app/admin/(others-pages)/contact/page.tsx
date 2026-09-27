import { Metadata } from "next";
import AdminContact from "@/components/admin/AdminContact";

export const metadata: Metadata = { title: "Contact Messages | Admin" };

export default function ContactPage() {
  return <AdminContact />;
}
