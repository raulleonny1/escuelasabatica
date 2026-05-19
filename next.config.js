const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Evita doble montaje del visor PDF en desarrollo (rompe pdf.js)
  reactStrictMode: false,
  turbopack: {}, // Configuración mínima para habilitar Turbopack y evitar el error
};

module.exports = withPWA(nextConfig);
