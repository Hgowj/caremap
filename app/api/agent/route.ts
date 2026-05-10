import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import toiletData from "../../../public/toilets.json";

const SYSTEM_PROMPT = `You are CareMap, a helpful and friendly accessible navigation assistant for caregivers and seniors in Singapore.
You help users find toilets, medical facilities, hawker centres, gyms, eldercare centres, and accessible routes.
Always respond in the same language the user wrote in.
Keep responses concise, warm, and practical — 2-4 sentences maximum.
When you find nearby places, list them clearly with distances.
If the user asks to navigate somewhere, confirm the destination and suggest they use the route planner.`;

interface AgentMessage {
  role: "user" | "assistant";
  content: string;
}

interface AgentRequest {
  message:   string;
  history:   AgentMessage[];
  userLat?:  number;
  userLng?:  number;
  language?: string;
}

// ── Keyword-based intent detection (works without AI) ────────────────────────
function detectIntent(message: string): {
  intent:        "FIND_TOILET" | "FIND_FACILITY" | "GET_ROUTE" | "GENERAL_CHAT";
  facility_type: string;
  destination:   string;
} {
  const m = message.toLowerCase();

  // Toilet keywords — EN, ZH, TH, TL, TA
  if (
    m.includes("toilet") || m.includes("washroom") || m.includes("restroom") ||
    m.includes("bathroom") || m.includes("loo") || m.includes("wc") ||
    m.includes("厕所") || m.includes("洗手间") || m.includes("卫生间") ||
    m.includes("ห้องน้ำ") || m.includes("banyo") || m.includes("cr") ||
    m.includes("கழிவறை") || m.includes("கழிப்பறை")
  ) {
    return { intent: "FIND_TOILET", facility_type: "toilet", destination: "" };
  }

  // Medical keywords
  if (
    m.includes("clinic") || m.includes("doctor") || m.includes("gp") ||
    m.includes("hospital") || m.includes("pharmacy") || m.includes("medicine") ||
    m.includes("medical") || m.includes("polyclinic") || m.includes("health") ||
    m.includes("诊所") || m.includes("医院") || m.includes("药房") || m.includes("医生") ||
    m.includes("คลินิก") || m.includes("โรงพยาบาล") || m.includes("หมอ") ||
    m.includes("ospital") || m.includes("botika") || m.includes("doktor") ||
    m.includes("மருத்துவ") || m.includes("மருந்தக") || m.includes("மருத்துவர்")
  ) {
    return { intent: "FIND_FACILITY", facility_type: "medical", destination: "" };
  }

  // Hawker / food keywords
  if (
    m.includes("hawker") || m.includes("food") || m.includes("eat") ||
    m.includes("hungry") || m.includes("restaurant") || m.includes("canteen") ||
    m.includes("吃") || m.includes("食") || m.includes("小贩") || m.includes("饭") ||
    m.includes("อาหาร") || m.includes("กิน") || m.includes("ร้านอาหาร") ||
    m.includes("pagkain") || m.includes("kain") || m.includes("carinderia") ||
    m.includes("சாப்பிட") || m.includes("உணவு")
  ) {
    return { intent: "FIND_FACILITY", facility_type: "hawker", destination: "" };
  }

  // Eldercare keywords
  if (
    m.includes("eldercare") || m.includes("senior") || m.includes("elderly") ||
    m.includes("activity centre") || m.includes("sac") || m.includes("老人") ||
    m.includes("乐龄") || m.includes("ผู้สูงอายุ") || m.includes("matatanda") ||
    m.includes("முதியோர்")
  ) {
    return { intent: "FIND_FACILITY", facility_type: "eldercare", destination: "" };
  }

  // Gym keywords
  if (
    m.includes("gym") || m.includes("exercise") || m.includes("fitness") ||
    m.includes("workout") || m.includes("健身") || m.includes("ฟิตเนส") ||
    m.includes("gym") || m.includes("உடற்பயிற்சி")
  ) {
    return { intent: "FIND_FACILITY", facility_type: "gyms", destination: "" };
  }

  // Route / navigation keywords
  if (
    m.includes("route") || m.includes("navigate") || m.includes("direction") ||
    m.includes("how to get") || m.includes("how do i get") || m.includes("walk to") ||
    m.includes("go to") || m.includes("路线") || m.includes("怎么去") ||
    m.includes("เส้นทาง") || m.includes("ไปที่") || m.includes("ruta") ||
    m.includes("பாதை") || m.includes("வழி")
  ) {
    return { intent: "GET_ROUTE", facility_type: "", destination: "" };
  }

  return { intent: "GENERAL_CHAT", facility_type: "", destination: "" };
}

// ── Haversine distance in metres ─────────────────────────────────────────────
function distanceMetres(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R    = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a    =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDist(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(1)}km` : `${Math.round(m)}m`;
}

// ── Tool: find toilets (direct JSON — no self-fetch) ─────────────────────────
interface ToiletEntry {
  id:          string;
  lat:         number;
  lng:         number;
  name:        string;
  wheelchair:  boolean;
  bidet:       boolean;
  free?:       boolean;
}

function findToiletsLocal(
  lat: number,
  lng: number,
  radiusMetres: number = 600
): string {
  try {
    const all       = toiletData as ToiletEntry[];
    const radiusDeg = radiusMetres / 111320;

    const nearby = all
      .filter(t => Math.sqrt((t.lat - lat) ** 2 + (t.lng - lng) ** 2) <= radiusDeg)
      .map(t => ({ ...t, dist: distanceMetres(lat, lng, t.lat, t.lng) }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 3);

    if (nearby.length === 0) {
      return `No public toilets found within ${radiusMetres}m of your location.`;
    }

    const lines = nearby.map(t => {
      const tags = [
        t.wheelchair ? "♿ wheelchair accessible" : "",
        t.free       ? "free entry"               : "",
      ].filter(Boolean).join(", ");
      return `• ${t.name} — ${formatDist(t.dist)}${tags ? ` (${tags})` : ""}`;
    });

    return `Found ${nearby.length} toilet${nearby.length !== 1 ? "s" : ""} nearby:\n${lines.join("\n")}\n\nTap the 🚽 button on the map to see all toilets.`;
  } catch (err) {
    console.error("[Agent] findToiletsLocal error:", err);
    return "I had trouble finding toilets. Please tap the 🚽 button on the map to see nearby ones.";
  }
}

// ── Tool: find facilities (direct external API — no self-fetch) ───────────────
async function findFacilities(
  facilityType: string,
  lat: number,
  lng: number,
  _baseUrl: string
): Promise<string> {
  const typeMap: Record<string, string> = {
    medical:   "chas",
    hawker:    "hawker",
    eldercare: "eldercare",
    gyms:      "gyms",
    pharmacy:  "pharmacy",
  };

  const apiType = typeMap[facilityType] ?? facilityType;

  const typeLabel: Record<string, string> = {
    chas:      "GP clinic",
    hawker:    "hawker centre",
    eldercare: "eldercare centre",
    gyms:      "gym",
    pharmacy:  "pharmacy",
  };

  try {
    let list: Array<{ name: string; address?: string; lat: number; lng: number }> = [];

    if (apiType === "hawker") {
      const hawkerDatasetId = "d_4a086da0a5553be1d89383cd90d07ecd";
      const pollRes = await fetch(
        `https://api-open.data.gov.sg/v1/public/api/datasets/${hawkerDatasetId}/poll-download`,
        { signal: AbortSignal.timeout(8000) }
      );
      const poll = await pollRes.json() as any;
      if (poll.code === 0) {
        const geoRes  = await fetch(poll.data.url, { signal: AbortSignal.timeout(10000) });
        const geoJson = await geoRes.json() as any;
        list = (geoJson.features ?? [])
          .filter((f: any) => f.geometry?.coordinates)
          .map((f: any) => ({
            name:    f.properties?.NAME ?? f.properties?.name ?? "Hawker Centre",
            address: f.properties?.ADDRESS ?? "",
            lat:     f.geometry.coordinates[1],
            lng:     f.geometry.coordinates[0],
          }));
      }
    } else {
      const datasetIds: Record<string, string> = {
        chas:      "d_548c33ea2d99e29ec63a7cc9edcccedc",
        eldercare: "d_f0fd1b3643ed8bd34bd403dedd7c1533",
        gyms:      "d_b3ae090692ecf632116c9885cfbd3424",
        pharmacy:  "d_bb92615f43de22933e4479558b1f6c36",
      };

      const datasetId = datasetIds[apiType];
      if (datasetId) {
        const pollRes = await fetch(
          `https://api-open.data.gov.sg/v1/public/api/datasets/${datasetId}/poll-download`,
          { signal: AbortSignal.timeout(8000) }
        );
        const poll = await pollRes.json() as any;
        if (poll.code === 0) {
          const geoRes  = await fetch(poll.data.url, { signal: AbortSignal.timeout(12000) });
          const geoJson = await geoRes.json() as any;

          list = (geoJson.features ?? [])
            .filter((f: any) => f.geometry?.coordinates)
            .map((f: any) => {
              const desc         = f.properties?.Description ?? "";
              const nameMatch    = desc.match(/<th>(?:NAME|HCI_NAME|PHARMACY_NAME)<\/th>\s*<td>([^<]+)<\/td>/i);
              const addressMatch = desc.match(/<th>(?:ADDRESSSTREETNAME|STREET_NAME|ROAD_NAME)<\/th>\s*<td>([^<]+)<\/td>/i);
              return {
                name:    nameMatch?.[1]?.trim()    ?? f.properties?.Name ?? "Facility",
                address: addressMatch?.[1]?.trim() ?? "",
                lat:     f.geometry.coordinates[1],
                lng:     f.geometry.coordinates[0],
              };
            });
        }
      }
    }

    if (list.length === 0) {
      return `No ${typeLabel[apiType] ?? facilityType}s found. Please check the Facilities page for more options.`;
    }

    const top = list
      .filter(f => f.lat && f.lng)
      .map(f => ({ ...f, dist: distanceMetres(lat, lng, f.lat, f.lng) }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 3);

    const label = typeLabel[apiType] ?? facilityType;
    const lines = top.map(f =>
      `• ${f.name}${f.address ? ` (${f.address})` : ""} — ${formatDist(f.dist)}`
    );

    return `Found ${list.length} ${label}${list.length !== 1 ? "s" : ""} in Singapore. Nearest to you:\n${lines.join("\n")}\n\nUse the Facilities page to browse all options.`;
  } catch (err) {
    console.error("[Agent] findFacilities error:", err);
    return `I couldn't fetch ${typeLabel[apiType] ?? facilityType} data right now. Please check the Facilities page instead.`;
  }
}

// ── Call Workers AI with timeout ──────────────────────────────────────────────
async function callAI(
  ai: any,
  messages: AgentMessage[],
  maxTokens = 300
): Promise<string> {
  const timeoutMs = 12000;

  const aiPromise = ai.run("@cf/meta/llama-3.1-8b-instruct", {
    messages,
    max_tokens: maxTokens,
  }) as Promise<{ response?: string }>;

  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("AI_TIMEOUT")), timeoutMs)
  );

  const result = await Promise.race([aiPromise, timeoutPromise]);
  return result?.response ?? "";
}

// ── Main handler ──────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  let body: AgentRequest;
  try {
    body = await req.json() as AgentRequest;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const {
    message,
    history  = [],
    userLat  = 1.3521,
    userLng  = 103.8198,
    language = "en",
  } = body;

  if (!message?.trim()) {
    return NextResponse.json({ error: "Empty message" }, { status: 400 });
  }

  const { env } = await getCloudflareContext({ async: true });
  const ai      = (env as any).AI;
  const baseUrl = (env as any).NEXT_PUBLIC_BASE_URL ?? "https://caremap.goh-jing-wen.workers.dev";

  if (!ai) {
    return NextResponse.json(
      { response: "AI assistant is not available right now. Please try again later." },
      { status: 200 }
    );
  }

  try {
    // Step 1: Detect intent (keyword first, AI as enhancement)
    const intent = detectIntent(message);
    console.log(`[Agent] Intent: ${intent.intent}, type: ${intent.facility_type}`);

    // Step 2: Execute tool based on intent
    let toolResult = "";

    if (intent.intent === "FIND_TOILET") {
      toolResult = findToiletsLocal(userLat, userLng, 600);
    } else if (intent.intent === "FIND_FACILITY" && intent.facility_type) {
      toolResult = await findFacilities(intent.facility_type, userLat, userLng, baseUrl);
    } else if (intent.intent === "GET_ROUTE") {
      toolResult = "To get a route, please use the route planner on the map — tap 'Where would you like to go?' and I'll help you find the best accessible path!";
    }

    // Step 3: Build messages for AI response generation
    const aiMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: SYSTEM_PROMPT },
      ...history.slice(-4).map(m => ({
        role:    m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user", content: message },
    ];

    if (toolResult) {
      aiMessages.push({
        role:    "assistant",
        content: `[Data retrieved]: ${toolResult}`,
      });
      aiMessages.push({
        role:    "user",
        content: `Based on the data above, please give a helpful, friendly response in ${
          language === "zh" ? "Mandarin Chinese" :
          language === "th" ? "Thai" :
          language === "tl" ? "Filipino/Tagalog" :
          language === "ta" ? "Tamil" :
          "English"
        }. Be concise and practical.`,
      });
    }

    // Step 4: Generate natural language response
    let responseText = "";
    try {
      responseText = await callAI(ai, aiMessages as any, 300);
    } catch (aiErr: any) {
      console.error("[Agent] AI response error:", aiErr?.message ?? aiErr);

      // If AI failed, return the tool result directly as a simple response
      if (toolResult) {
        responseText = toolResult;
      } else {
        const fallbacks: Record<string, string> = {
          en: "I'm having a bit of trouble connecting right now. Please try again in a moment! 😊",
          zh: "我现在连接有些困难。请稍后再试！😊",
          th: "ฉันมีปัญหาในการเชื่อมต่อตอนนี้ กรุณาลองอีกครั้งในอีกสักครู่! 😊",
          tl: "Nagkakaroon ako ng problema sa koneksyon ngayon. Pakisubukang muli sa sandali! 😊",
          ta: "இப்போது இணைப்பில் சிறிய சிக்கல் உள்ளது. சற்று நேரம் கழித்து மீண்டும் முயற்சிக்கவும்! 😊",
        };
        responseText = fallbacks[language] ?? fallbacks.en;
      }
    }

    // Ensure we always return something
    if (!responseText.trim()) {
      responseText = toolResult || "I'm not sure how to help with that. Try asking me to find a toilet, clinic, or hawker centre nearby!";
    }

    console.log(`[Agent] Response (${language}): ${responseText.slice(0, 100)}...`);

    return NextResponse.json({
      response:   responseText,
      intent:     intent.intent,
      toolResult,
    });

  } catch (err: any) {
    console.error("[Agent] Unexpected error:", err?.message ?? err);
    return NextResponse.json({
      response: "Something went wrong. Please try again! 😊",
      intent:   "GENERAL_CHAT",
    });
  }
}