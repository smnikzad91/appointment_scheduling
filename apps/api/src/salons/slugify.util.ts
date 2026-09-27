import { PrismaService } from "../prisma/prisma.service.js";

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 7);
}

/** Persian salon names rarely transliterate cleanly to ASCII, so this always appends a random
 * suffix for uniqueness rather than relying on the name alone — the slug is a URL identifier,
 * not meant to be human-readable for non-Latin names. */
export async function generateUniqueSlug(prisma: PrismaService, name: string): Promise<string> {
  const base =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "salon";

  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = `${base}-${randomSuffix()}`;
    const existing = await prisma.salon.findUnique({ where: { slug } });
    if (!existing) return slug;
  }

  throw new Error("Could not generate a unique salon slug");
}
