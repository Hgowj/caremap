import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const locale = cookieStore.get("cm_locale")?.value ?? "en";
  const validLocales = ["en", "zh", "th", "tl", "ta"];
  const resolved = validLocales.includes(locale) ? locale : "en";

  return {
    locale: resolved,
    messages: (await import(`../messages/${resolved}.json`)).default,
  };
});