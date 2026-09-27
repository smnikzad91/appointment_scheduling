import { Metadata } from "next";
import AdminBlogCategories from "@/components/admin/AdminBlogCategories";

export const metadata: Metadata = { title: "Blog Categories | Admin" };

export default function BlogCategoriesPage() {
  return <AdminBlogCategories />;
}
