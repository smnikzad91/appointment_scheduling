import { Metadata } from "next";
import AdminFaqs from "@/components/admin/AdminFaqs";

export const metadata: Metadata = { title: "FAQs | Admin" };

export default function FaqsPage() {
  return <AdminFaqs />;
}
