import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

const SYSTEM_PROMPT = `You are CareMap, an accessible navigation assistant for caregivers and seniors in Singapore.
You help users find toilets, medical facilities, hawker centres, and accessible routes.
Always respond in the same language the user wrote in.
You have access to these tools:
- find_toilets(lat, lng, radius): finds nearby accessible toilets
- find_facilities(type, lat, lng): finds nearby facilities (medical/eldercare/gym/hawker)
- get_route(startLat, startLng, endLat, endLng, mode): gets walking/transit route

When a user asks to navigate somewhere, always confirm the destination before routing.
Keep responses concise and friendly. Use the user's language throughout.`;

interface AgentMessage {
  role: "user" | "assistant";
  content: string;
}

interface AgentRequest {
  message: string;
  history: AgentMessage[];
  userLat?: number;
  userLng?: number;
  language?: string;
}

export async function POST(req: NextRequest) {
  const { env } = await getCloudflareContext({ async: true });
  const ai = env.AI;

  if (!ai) return NextResponse.json({ error: "AI not available" }, { status: 500 });

  const body = await req.json() as AgentRequest;
  const { message, history = [], userLat = 1.3521, userLng = 103.8198 } = body;

  // Step 1: Use SEA-Lion to understand intent and generate response
  const messages = [
    { role: "system" as const, content: SYSTEM_PROMPT },
    ...history.slice(-6), // keep last 3 exchanges for context
    { role: "user" as const, content: message },
  ];

  try {
    // First pass: detect intent
    const intentResponse = await ai.run("@cf/meta/llama-3.1-8b-instruct", {
      messages: [
        {
          role: "system",
          content: `You are an intent classifier for CareMap navigation app. 
Classify the user message into one of: FIND_TOILET, FIND_FACILITY, GET_ROUTE, GENERAL_CHAT.
Also extract: facility_type (toilet/medical/eldercare/gym/hawker), destination_name if mentioned.
Respond ONLY with JSON: {"intent": "...", "facility_type": "...", "destination": "..."}`,
        },
        { role: "user", content: message },
      ],
      max_tokens: 100,
    }) as any;

    let intent = { intent: "GENERAL_CHAT", facility_type: "", destination: "" };
    try {
      const intentText = intentResponse.response ?? "";
      const jsonMatch = intentText.match(/\{[\s\S]*?\}/);
      if (jsonMatch) intent = JSON.parse(jsonMatch[0]);
    } catch {}

    // Step 2: Execute tool based on intent
    let toolResult = "";

    if (intent.intent === "FIND_TOILET" || intent.facility_type === "toilet") {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/pois?lat=${userLat}&lng=${userLng}&radius=500&types=toilet`
      );
      const data = await res.json() as any;
      const toilets = (data.toilets ?? []).slice(0, 3);
      if (toilets.length > 0) {
        toolResult = `Found ${toilets.length} nearby toilets: ${toilets.map((t: any) =>
          `${t.name} (${Math.round(Math.sqrt((t.lat - userLat)**2 + (t.lng - userLng)**2) * 111320)}m away${t.hasHandicap ? ", wheelchair accessible" : ""})`
        ).join("; ")}`;
      } else {
        toolResult = "No toilets found within 500m.";
      }
    } else if (intent.intent === "FIND_FACILITY" && intent.facility_type) {
      const typeMap: Record<string, string> = {
        medical: "chas", eldercare: "eldercare", gym: "gyms", hawker: "hawker",
      };
      const apiType = typeMap[intent.facility_type] ?? intent.facility_type;
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/facilities?types=${apiType}`
      );
      const data = await res.json() as any;
      const items = (data[apiType] ?? []).slice(0, 3);
      if (items.length > 0) {
        toolResult = `Found nearby ${intent.facility_type}: ${items.map((f: any) => f.name).join(", ")}`;
      }
    }

    // Step 3: Generate final response with SEA-Lion
    const finalMessages = [
      { role: "system" as const, content: SYSTEM_PROMPT },
      ...history.slice(-4),
      { role: "user" as const, content: message },
    ];

    if (toolResult) {
      finalMessages.push({
        role: "assistant" as const,
        content: `[Tool result: ${toolResult}]`,
      });
      finalMessages.push({
        role: "user" as const,
        content: "Based on that information, please respond to the user helpfully in their language.",
      });
    }

    const response = await ai.run("@cf/meta/llama-3.1-8b-instruct", {
      messages: finalMessages,
      max_tokens: 300,
    }) as any;

    return NextResponse.json({
      response: response.response ?? "I'm sorry, I couldn't process that request.",
      intent: intent.intent,
      toolResult,
    });

  } catch (err) {
    console.error("[Agent] Error:", err);
    return NextResponse.json({ error: "Agent error" }, { status: 500 });
  }
}