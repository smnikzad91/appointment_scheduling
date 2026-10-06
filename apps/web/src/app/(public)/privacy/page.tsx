import { Metadata } from "next";
import { seoMetadata } from "@/lib/pageSeo";
import LegalPageClient from "@/components/public/LegalPageClient";

// Edited at /admin/seo-settings; static pages refresh it every minute
export const revalidate = 60;

export function generateMetadata(): Promise<Metadata> {
  return seoMetadata("privacy", "/privacy");
}

export default function PrivacyPage() {
  return <LegalPageClient type="privacy" />;
}
