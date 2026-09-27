import { Metadata } from "next";
import EditBlogPostForm from "@/components/admin/EditBlogPostForm";

export const metadata: Metadata = { title: "Edit Post | Admin" };

interface Props { params: Promise<{ id: string }> }

export default async function EditBlogPostPage({ params }: Props) {
  const { id } = await params;
  return <EditBlogPostForm id={id} />;
}
