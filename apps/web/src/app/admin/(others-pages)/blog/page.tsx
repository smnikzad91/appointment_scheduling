import { Metadata } from "next";
import AdminBlogList from "@/components/admin/AdminBlogList";

export const metadata: Metadata = { title: "Blog Posts | Admin" };

export default function AdminBlogPage() {
  return <AdminBlogList />;
}
