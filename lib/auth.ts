import { NextRequest } from "next/server";

export interface Session {
  userId: string;
  exp: number;
}

export function getSession(req: NextRequest): Session | null {
  try {
    const cookie = req.cookies.get("cm_session")?.value;
    if (!cookie) return null;
    const session = JSON.parse(Buffer.from(cookie, "base64").toString()) as Session;
    if (session.exp < Date.now()) return null;
    return session;
  } catch {
    return null;
  }
}