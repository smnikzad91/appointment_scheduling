import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      // "/signup" alone would also block /signup-salon (prefix match); the longer allow wins
      allow: ["/", "/signup-salon"],
      disallow: ["/admin/", "/dashboard/", "/salon/", "/stylist/", "/my-bookings", "/api/", "/signin", "/signup", "/set-password/", "/reset-password", "/r/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
