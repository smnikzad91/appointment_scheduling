import { Metadata } from "next";
import AdminBankSms from "@/components/admin/AdminBankSms";

export const metadata: Metadata = { title: "Bank SMS | Admin" };

export default function BankSmsPage() {
  return <AdminBankSms />;
}
