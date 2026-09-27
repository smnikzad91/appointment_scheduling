import EditNewsItemForm from "@/components/admin/EditNewsItemForm";

export const metadata = { title: "Edit News | Admin" };

interface Props { params: Promise<{ id: string }> }

export default async function EditNewsPage({ params }: Props) {
  const { id } = await params;
  return <EditNewsItemForm id={id} />;
}
