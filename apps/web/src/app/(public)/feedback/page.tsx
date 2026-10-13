import { Metadata } from "next";
import { seoMetadata } from "@/lib/pageSeo";
import FeedbackPageClient from "@/components/public/FeedbackPageClient";

// Edited at /admin/seo-settings; static pages refresh it every minute
export const revalidate = 60;

export function generateMetadata(): Promise<Metadata> {
  return seoMetadata("feedback", "/feedback");
}

export default function FeedbackPage() {
  return <FeedbackPageClient />;
}
