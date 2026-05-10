import createMiddleware from "next-intl/middleware";

export default createMiddleware({
  locales: ["en", "zh", "th", "tl", "ta"],
  defaultLocale: "en",
  localePrefix: "never", // Cookie-based switching only, no URL prefixes
  localeDetection: false,
});

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};