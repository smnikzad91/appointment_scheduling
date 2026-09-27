import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin/", "/dashboard/", "/api/", "/signin", "/signup"],
    },
    sitemap: "https://mqttcloud.ir/sitemap.xml",
  };
}
