import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";

export default getRequestConfig(async () => {
  let locale = "en";
  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get("cm_locale")?.value;
    const validLocales = ["en", "zh", "th", "tl", "ta"];
    if (raw && validLocales.includes(raw)) locale = raw;
  } catch {}

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
