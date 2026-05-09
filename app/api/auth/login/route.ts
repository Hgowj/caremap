import { NextRequest, NextResponse } from "next/server";

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "caremap-salt-2026");
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}

export async function POST(req: NextRequest) {
  const db = (process.env as any).DB as D1Database;
  if (!db) return NextResponse.json({ error: "DB not available" }, { status: 500 });

  const { email, password } = await req.json();

  try {
    const user = await db.prepare("SELECT id, password_hash FROM users WHERE email = ?")
      .bind(email.toLowerCase()).first<{ id: string; password_hash: string }>();

    if (!user) return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });

    const hash = await hashPassword(password);
    if (hash !== user.password_hash) return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });

    const now = Date.now();
    const sessionToken = Buffer.from(JSON.stringify({ userId: user.id, exp: now + 30 * 24 * 60 * 60 * 1000 })).toString("base64");

    const res = NextResponse.json({ success: true, userId: user.id });
    res.cookies.set("cm_session", sessionToken, {
      httpOnly: true, secure: true, sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60, path: "/",
    });
    return res;
  } catch (err) {
    console.error("[Auth] Login error:", err);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}