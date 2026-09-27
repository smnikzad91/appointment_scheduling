import { Metadata } from "next";
import NewBlogPostForm from "@/components/admin/NewBlogPostForm";

export const metadata: Metadata = { title: "New Post | Admin" };

export default function NewBlogPostPage() {
  return <NewBlogPostForm />;
}
