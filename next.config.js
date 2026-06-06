const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  runtimeCaching: [
    {
      urlPattern: /^https?:\/\/.*\/pdfs\/.*\.pdf$/i,
      handler: "CacheFirst",
      options: {
        cacheName: "escuelasabatica-pdfs",
        expiration: {
          maxEntries: 80,
          maxAgeSeconds: 60 * 60 * 24 * 365,
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
    {
      urlPattern: /^https?:\/\/.*\/biblia\/.*\.json$/i,
      handler: "CacheFirst",
      options: {
        cacheName: "escuelasabatica-biblia",
        expiration: {
          maxEntries: 4,
          maxAgeSeconds: 60 * 60 * 24 * 365,
        },
      },
    },
    {
      urlPattern: /^https?:\/\/.*\/pdf\.worker.*\.js$/i,
      handler: "CacheFirst",
      options: {
        cacheName: "escuelasabatica-pdf-worker",
        expiration: {
          maxEntries: 2,
          maxAgeSeconds: 60 * 60 * 24 * 365,
        },
      },
    },
  ],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Evita doble montaje del visor PDF en desarrollo (rompe pdf.js)
  reactStrictMode: false,
  turbopack: {},
};

module.exports = withPWA(nextConfig);
