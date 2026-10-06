import { Metadata } from "next";
import { seoMetadata } from "@/lib/pageSeo";
import LegalPageClient from "@/components/public/LegalPageClient";

// Edited at /admin/seo-settings; static pages refresh it every minute
export const revalidate = 60;

export function generateMetadata(): Promise<Metadata> {
  return seoMetadata("terms", "/terms");
}

export default function TermsPage() {
  return <LegalPageClient type="terms" />;
}
