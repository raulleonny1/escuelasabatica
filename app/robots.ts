import type { MetadataRoute } from "next"

/** Permite el rastreador de AdSense (Mediapartners-Google). */
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
        allow: "/",
      },
    ],
  }
}
