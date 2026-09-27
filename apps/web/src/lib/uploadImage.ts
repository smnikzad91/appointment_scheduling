export async function uploadImage(file: File, folder: "salons" | "stylists"): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`/api/upload?folder=${folder}`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? "خطا در آپلود تصویر");
  }

  const data = (await res.json()) as { url: string };
  return data.url;
}
