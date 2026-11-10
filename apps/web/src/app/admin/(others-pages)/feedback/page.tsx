import { Metadata } from "next";
import AdminFeedback from "@/components/admin/AdminFeedback";

export const metadata: Metadata = { title: "Feedback | Admin" };

export default function FeedbackPage() {
  return <AdminFeedback />;
}
