import { Metadata } from "next";
import { seoMetadata } from "@/lib/pageSeo";
import ContactPageClient from "@/components/public/ContactPageClient";

// Edited at /admin/seo-settings; static pages refresh it every minute
export const revalidate = 60;

export function generateMetadata(): Promise<Metadata> {
  return seoMetadata("contact", "/contact");
}

export default function ContactPage() {
  return <ContactPageClient />;
}
