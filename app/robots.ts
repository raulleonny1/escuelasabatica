import type { MetadataRoute } from "next"

/** Permite el rastreador de AdSense y acceso a ads.txt. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "Mediapartners-Google",
        allow: "/",
      },
      {
        userAgent: "AdsBot-Google",
        allow: "/",
      },
      {
        userAgent: "*",
        allow: ["/", "/ads.txt"],
      },
    ],
    sitemap: "https://escuelasabatica-sable.vercel.app/sitemap.xml",
  }
}
