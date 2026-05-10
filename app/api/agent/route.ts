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

interface ToiletEntry {
  id:         string;
  lat:        number;
  lng:        number;
  name:       string;
  wheelchair: boolean;
  bidet:      boolean;
  free?:      boolean;
}

// ── Haversine distance ────────────────────────────────────────────────────────
function distanceMetres(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R    = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a    =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDist(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;
}

// ── Geocode a place name via OneMap ───────────────────────────────────────────
async function geocodeLocation(query: string): Promise<{ lat: number; lng: number; name: string } | null> {
  try {
    const res  = await fetch(
      `https://www.onemap.gov.sg/api/common/elastic/search?searchVal=${encodeURIComponent(query)}&returnGeom=Y&getAddrDetails=Y&pageNum=1`,
      { signal: AbortSignal.timeout(5000) }
    );
    const data = await res.json() as any;
    const r    = data?.results?.[0];
    if (!r?.LATITUDE || !r?.LONGITUDE) return null;
    return {
      lat:  parseFloat(r.LATITUDE),
      lng:  parseFloat(r.LONGITUDE),
      name: r.BUILDING && r.BUILDING !== "NIL" ? r.BUILDING : r.ADDRESS,
    };
  } catch {
    return null;
  }
}

// ── Extract location mention from message ─────────────────────────────────────
function extractLocationQuery(message: string): string | null {
  const patterns = [
    /(?:near|at|around|beside|next to|in|by|to)\s+(.+?)(?:\?|$)/i,
    /(?:附近|在|旁边)\s*(.+?)(?:\?|$)/,
    /(?:ใกล้|ที่|แถว)\s*(.+?)(?:\?|$)/,
    /(?:malapit sa|sa|doon sa)\s+(.+?)(?:\?|$)/i,
    /(?:அருகில்|உள்ள)\s+(.+?)(?:\?|$)/,
  ];
  for (const p of patterns) {
    const m = message.match(p);
    if (m?.[1]?.trim()) return m[1].trim();
  }
  return null;
}

// ── Keyword intent detection ──────────────────────────────────────────────────
function detectIntent(message: string): { intent: "FIND_TOILET" | "FIND_FACILITY" | "GET_ROUTE" | "GENERAL_CHAT"; facility_type: string } {
  const m = message.toLowerCase();

  if (m.includes("toilet") || m.includes("washroom") || m.includes("restroom") ||
      m.includes("bathroom") || m.includes("loo") || m.includes("wc") ||
      m.includes("厕所") || m.includes("洗手间") || m.includes("卫生间") ||
      m.includes("ห้องน้ำ") || m.includes("banyo") ||
      m.includes("கழிவறை") || m.includes("கழிப்பறை")) {
    return { intent: "FIND_TOILET", facility_type: "toilet" };
  }

  if (m.includes("clinic") || m.includes("doctor") || m.includes("gp") ||
      m.includes("hospital") || m.includes("pharmacy") || m.includes("polyclinic") ||
      m.includes("medical") || m.includes("health") ||
      m.includes("诊所") || m.includes("医院") || m.includes("药房") ||
      m.includes("คลินิก") || m.includes("โรงพยาบาล") ||
      m.includes("ospital") || m.includes("botika") ||
      m.includes("மருத்துவ") || m.includes("மருந்தக")) {
    return { intent: "FIND_FACILITY", facility_type: "medical" };
  }

  if (m.includes("hawker") || m.includes("food") || m.includes("eat") ||
      m.includes("hungry") || m.includes("restaurant") || m.includes("canteen") ||
      m.includes("吃") || m.includes("小贩") ||
      m.includes("อาหาร") || m.includes("กิน") ||
      m.includes("pagkain") || m.includes("kain") ||
      m.includes("சாப்பிட") || m.includes("உணவு")) {
    return { intent: "FIND_FACILITY", facility_type: "hawker" };
  }

  if (m.includes("eldercare") || m.includes("senior") || m.includes("elderly") ||
      m.includes("activity centre") || m.includes("sac") ||
      m.includes("老人") || m.includes("乐龄") ||
      m.includes("ผู้สูงอายุ") || m.includes("matatanda") ||
      m.includes("முதியோர்")) {
    return { intent: "FIND_FACILITY", facility_type: "eldercare" };
  }

  if (m.includes("gym") || m.includes("exercise") || m.includes("fitness") ||
      m.includes("workout") || m.includes("健身") || m.includes("ฟิตเนส") ||
      m.includes("உடற்பயிற்சி")) {
    return { intent: "FIND_FACILITY", facility_type: "gyms" };
  }

  if (m.includes("route") || m.includes("navigate") || m.includes("direction") ||
      m.includes("how to get") || m.includes("walk to") || m.includes("go to") ||
      m.includes("路线") || m.includes("เส้นทาง") || m.includes("ruta") ||
      m.includes("பாதை")) {
    return { intent: "GET_ROUTE", facility_type: "" };
  }

  return { intent: "GENERAL_CHAT", facility_type: "" };
}

// ── Find toilets from bundled JSON ────────────────────────────────────────────
function findToiletsLocal(lat: number, lng: number, radiusMetres = 800): string {
  try {
    const all       = toiletData as ToiletEntry[];
    const radiusDeg = radiusMetres / 111320;

    const nearby = all
      .filter(t => Math.sqrt((t.lat - lat) ** 2 + (t.lng - lng) ** 2) <= radiusDeg)
      .map(t => ({ ...t, dist: distanceMetres(lat, lng, t.lat, t.lng) }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 3);

    if (nearby.length === 0) {
      return `No public toilets found within ${radiusMetres}m. Try tapping the 🚽 button on the map to see all toilets.`;
    }

    const lines = nearby.map(t => {
      const tags = [
        t.wheelchair ? "♿ accessible" : "",
        t.free       ? "free"          : "",
      ].filter(Boolean).join(", ");
      return `• ${t.name} — ${formatDist(t.dist)}${tags ? ` (${tags})` : ""}`;
    });

    return `Found ${nearby.length} toilet${nearby.length !== 1 ? "s" : ""} nearby:\n${lines.join("\n")}\n\nTap 🚽 on the map to see all toilets.`;
  } catch (err) {
    console.error("[Agent] findToiletsLocal error:", err);
    return "I had trouble finding toilets. Please tap the 🚽 button on the map.";
  }
}

// ── Find facilities from data.gov.sg ─────────────────────────────────────────
async function findFacilities(facilityType: string, lat: number, lng: number): Promise<string> {
  const datasetIds: Record<string, string> = {
    chas:      "d_548c33ea2d99e29ec63a7cc9edcccedc",
    eldercare: "d_f0fd1b3643ed8bd34bd403dedd7c1533",
    gyms:      "d_b3ae090692ecf632116c9885cfbd3424",
    pharmacy:  "d_bb92615f43de22933e4479558b1f6c36",
    hawker:    "d_4a086da0a5553be1d89383cd90d07ecd",
  };

  const typeLabel: Record<string, string> = {
    medical: "GP clinic", chas: "GP clinic", hawker: "hawker centre",
    eldercare: "eldercare centre", gyms: "gym", pharmacy: "pharmacy",
  };

  const apiType   = facilityType === "medical" ? "chas" : facilityType;
  const datasetId = datasetIds[apiType];
  const label     = typeLabel[facilityType] ?? typeLabel[apiType] ?? facilityType;

  if (!datasetId) return `I don't have data for ${facilityType} yet. Please check the Facilities page.`;

  try {
    const pollRes = await fetch(
      `https://api-open.data.gov.sg/v1/public/api/datasets/${datasetId}/poll-download`,
      { signal: AbortSignal.timeout(8000) }
    );
    const poll = await pollRes.json() as any;
    if (poll.code !== 0) throw new Error(`Poll failed: ${poll.errMsg}`);

    const geoRes  = await fetch(poll.data.url, { signal: AbortSignal.timeout(12000) });
    const geoJson = await geoRes.json() as any;

    const list: Array<{ name: string; address: string; lat: number; lng: number }> =
      (geoJson.features ?? [])
        .filter((f: any) => f.geometry?.coordinates?.length >= 2)
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

    if (list.length === 0) return `No ${label}s found. Please check the Facilities page.`;

    const top = list
      .filter(f => f.lat && f.lng)
      .map(f => ({ ...f, dist: distanceMetres(lat, lng, f.lat, f.lng) }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 3);

    const lines = top.map(f =>
      `• ${f.name}${f.address ? ` — ${f.address}` : ""} (${formatDist(f.dist)})`
    );

    return `Found ${list.length} ${label}${list.length !== 1 ? "s" : ""} in Singapore. Nearest to you:\n${lines.join("\n")}\n\nSee all options in the Facilities page.`;
  } catch (err) {
    console.error("[Agent] findFacilities error:", err);
    return `I couldn't load ${label} data right now. Please check the Facilities page instead.`;
  }
}

// ── Call Workers AI ───────────────────────────────────────────────────────────
async function callAI(
  ai:        any,
  messages:  Array<{ role: "system" | "user" | "assistant"; content: string }>,
  maxTokens  = 300
): Promise<string> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("AI_TIMEOUT")), 12000)
  );
  const result = await Promise.race([
    ai.run("@cf/meta/llama-3.1-8b-instruct", { messages, max_tokens: maxTokens }) as Promise<{ response?: string }>,
    timeout,
  ]);
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

  const { message, history = [], userLat = 1.3521, userLng = 103.8198, language = "en" } = body;

  if (!message?.trim()) {
    return NextResponse.json({ error: "Empty message" }, { status: 400 });
  }

  const { env } = await getCloudflareContext({ async: true });
  const ai      = (env as any).AI;

  if (!ai) {
    return NextResponse.json(
      { response: "AI assistant is not available right now. Please try again later." },
      { status: 200 }
    );
  }

  try {
    // Step 1: Detect intent
    const { intent, facility_type } = detectIntent(message);
    console.log(`[Agent] Intent: ${intent}, type: ${facility_type}, lang: ${language}`);

    // Step 2: Resolve search location — geocode named places
    let searchLat   = userLat;
    let searchLng   = userLng;
    let locationTag = "";

    const locationQuery = extractLocationQuery(message);
    if (locationQuery) {
      console.log(`[Agent] Geocoding: "${locationQuery}"`);
      const geocoded = await geocodeLocation(locationQuery);
      if (geocoded) {
        searchLat   = geocoded.lat;
        searchLng   = geocoded.lng;
        locationTag = geocoded.name;
        console.log(`[Agent] → ${searchLat}, ${searchLng} (${locationTag})`);
      }
    }

    // Step 3: Execute tool
    let toolResult = "";

    if (intent === "FIND_TOILET") {
      toolResult = findToiletsLocal(searchLat, searchLng, 800);
      if (locationTag) toolResult = `Near ${locationTag}:\n${toolResult}`;
    } else if (intent === "FIND_FACILITY" && facility_type) {
      toolResult = await findFacilities(facility_type, searchLat, searchLng);
      if (locationTag) toolResult = `Near ${locationTag}:\n${toolResult}`;
    } else if (intent === "GET_ROUTE") {
      toolResult = "To plan a route, tap 'Where would you like to go?' on the map screen. I'll help find the most accessible path based on your preferences!";
    }

    // Step 4: Generate natural response
    const langName: Record<string, string> = {
      en: "English", zh: "Mandarin Chinese", th: "Thai",
      tl: "Filipino/Tagalog", ta: "Tamil",
    };

    const aiMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: SYSTEM_PROMPT },
      ...history.slice(-4).map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
      { role: "user", content: message },
    ];

    if (toolResult) {
      aiMessages.push({ role: "assistant", content: `[Search results]: ${toolResult}` });
      aiMessages.push({
        role:    "user",
        content: `Present the above results in a friendly, helpful way in ${langName[language] ?? "English"}. Be concise and warm.`,
      });
    }

    let responseText = "";
    try {
      responseText = await callAI(ai, aiMessages, 300);
    } catch (aiErr: any) {
      console.error("[Agent] AI error:", aiErr?.message);
      if (toolResult) responseText = toolResult; // Return raw tool result if AI fails
    }

    if (!responseText.trim()) {
      const fallbacks: Record<string, string> = {
        en: "I'm having trouble connecting right now. Please try again in a moment! 😊",
        zh: "我现在连接有些困难。请稍后再试！😊",
        th: "ฉันมีปัญหาในการเชื่อมต่อตอนนี้ กรุณาลองอีกครั้ง! 😊",
        tl: "Nagkakaroon ako ng problema sa koneksyon. Pakisubukang muli! 😊",
        ta: "இணைப்பில் சிக்கல் உள்ளது. மீண்டும் முயற்சிக்கவும்! 😊",
      };
      responseText = fallbacks[language] ?? fallbacks.en;
    }

    return NextResponse.json({ response: responseText, intent, toolResult });

  } catch (err: any) {
    console.error("[Agent] Unexpected error:", err?.message ?? err);
    return NextResponse.json({
      response: "Something went wrong. Please try again! 😊",
      intent:   "GENERAL_CHAT",
    });
  }
}