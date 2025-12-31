import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/landing", "/privacy", "/terms"],
        disallow: ["/app", "/api"],
      },
    ],
    sitemap: "/sitemap.xml",
  };
}
