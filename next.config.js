const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  turbopack: {}, // Configuración mínima para habilitar Turbopack y evitar el error
};

module.exports = withPWA(nextConfig);
