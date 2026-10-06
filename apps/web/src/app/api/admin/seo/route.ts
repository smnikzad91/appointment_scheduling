import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PAGE_SEO_DEFAULTS, PAGE_SEO_KEYS, isPageSeoKey } from "@/lib/pageSeoDefaults";

// /admin/seo-settings: every public page's search-engine title / description / keywords (PageSeo,
// one row per key; lib/pageSeoDefaults.ts lists the keys). GET: all pages with their saved values
// and defaults. PUT {key, title, description, keywords}: one page; an empty field means «the default».

async function admin() {
  const session = await auth();
  return session?.user?.id && session.user.role === "PLATFORM_ADMIN";
}

export async function GET() {
  if (!(await admin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const rows = await prisma.pageSeo.findMany();
  const byKey = new Map(rows.map((r) => [r.key, r]));
  return NextResponse.json(
    PAGE_SEO_KEYS.map((key) => {
      const d = PAGE_SEO_DEFAULTS[key];
      const r = byKey.get(key);
      return {
        key,
        label: d.label,
        path: d.path,
        placeholders: d.placeholders ?? [],
        defaults: { title: d.title, description: d.description, keywords: d.keywords },
        title: r?.title ?? "",
        description: r?.description ?? "",
        keywords: r?.keywords ?? [],
        updatedAt: r?.updatedAt ?? null,
      };
    }),
  );
}

export async function PUT(req: Request) {
  if (!(await admin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json().catch(() => null);
  const key = typeof body?.key === "string" ? body.key : "";
  if (!isPageSeoKey(key)) return NextResponse.json({ error: "صفحه نامعتبر است" }, { status: 400 });

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const keywords: string[] = Array.isArray(body.keywords)
    ? [...new Set<string>(body.keywords.filter((k: unknown): k is string => typeof k === "string").map((k: string) => k.trim()).filter(Boolean))]
    : [];
  if (title.length > 120) return NextResponse.json({ error: "عنوان حداکثر ۱۲۰ نویسه باشد" }, { status: 400 });
  if (description.length > 400) return NextResponse.json({ error: "توضیحات حداکثر ۴۰۰ نویسه باشد" }, { status: 400 });
  if (keywords.length > 30 || keywords.some((k) => k.length > 80)) {
    return NextResponse.json({ error: "حداکثر ۳۰ کلمه کلیدی، هر کدام تا ۸۰ نویسه" }, { status: 400 });
  }

  const row = await prisma.pageSeo.upsert({
    where: { key },
    create: { key, title, description, keywords },
    update: { title, description, keywords },
  });
  return NextResponse.json({ key: row.key, title: row.title, description: row.description, keywords: row.keywords, updatedAt: row.updatedAt });
}
