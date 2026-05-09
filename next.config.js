/** @type {import('next').NextConfig} */
const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development", // disable SW in dev to avoid cache headaches
});

const nextConfig = {
  reactStrictMode: false,
};

module.exports = withPWA(nextConfig);
