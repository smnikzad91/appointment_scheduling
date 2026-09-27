import type { SocialPlatform } from "@/types/content";

export interface FeaturedBlog {
  slug: string;
  category: string;
  title: string;
  excerpt: string;
  coverImage?: string;
  readTime: string;
}

export interface FeaturedNews {
  id: string;
  category: string;
  title: string;
  body: string;
  image?: string;
  publishedAt?: string;
}

export interface SocialLinkItem {
  id: string;
  platform: SocialPlatform;
  url: string;
  label: string;
}

export interface FaqItem {
  _id: string;
  question: string;
  answer: string;
}
