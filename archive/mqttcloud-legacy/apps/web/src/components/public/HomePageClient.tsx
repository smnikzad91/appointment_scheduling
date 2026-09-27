"use client";

import { useEffect, useState } from "react";
import Hero from "@/components/public/home/Hero";
import IndicatorTicker from "@/components/public/home/IndicatorTicker";
import FeaturedContent from "@/components/public/home/FeaturedContent";
import Features from "@/components/public/home/Features";
import HowItWorks from "@/components/public/home/HowItWorks";
import FaqSection from "@/components/public/home/FaqSection";
import CtaSection from "@/components/public/home/CtaSection";
import type { FeaturedBlog, FeaturedNews, SocialLinkItem, FaqItem } from "@/components/public/home/types";

export default function HomePageClient({
  featuredBlog,
  featuredNews,
  socialLinks = [],
}: {
  featuredBlog?: FeaturedBlog | null;
  featuredNews?: FeaturedNews | null;
  socialLinks?: SocialLinkItem[];
}) {
  const [faqs, setFaqs] = useState<FaqItem[]>([]);

  useEffect(() => {
    fetch("/api/public/faqs").then((r) => r.json()).then((data) => {
      if (Array.isArray(data)) setFaqs(data);
    }).catch(() => {});
  }, []);

  return (
    <>
      <Hero featuredBlog={featuredBlog} featuredNews={featuredNews} socialLinks={socialLinks} />
      <IndicatorTicker />
      <FeaturedContent featuredBlog={featuredBlog} featuredNews={featuredNews} />
      <Features />
      <HowItWorks />
      <FaqSection faqs={faqs} />
      <CtaSection />
    </>
  );
}
