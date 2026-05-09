import { NextRequest, NextResponse } from "next/server";

// Simple hash using Web Crypto (works in Cloudflare Workers)
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "caremap-salt-2026");
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function generateId(): string {
  return crypto.randomUUID();
}

export async function POST(req: NextRequest) {
  const db = (process.env as any).DB as D1Database;
  if (!db) return NextResponse.json({ error: "DB not available" }, { status: 500 });

  const { email, password } = await req.json();
  if (!email || !password || password.length < 6) {
    return NextResponse.json({ error: "Invalid email or password (min 6 chars)" }, { status: 400 });
  }

  try {
    const existing = await db.prepare("SELECT id FROM users WHERE email = ?").bind(email.toLowerCase()).first();
    if (existing) return NextResponse.json({ error: "Email already registered" }, { status: 409 });

    const id = generateId();
    const hash = await hashPassword(password);
    const now = Date.now();

    await db.prepare("INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)")
      .bind(id, email.toLowerCase(), hash, now).run();

    // Create default preferences
    await db.prepare("INSERT INTO user_preferences (user_id) VALUES (?)").bind(id).run();

    // Set session cookie
    const token = generateId();
    // Store token in KV or just use a signed cookie approach — for simplicity, encode user id in token
    const sessionToken = Buffer.from(JSON.stringify({ userId: id, exp: now + 30 * 24 * 60 * 60 * 1000 })).toString("base64");

    const res = NextResponse.json({ success: true, userId: id });
    res.cookies.set("cm_session", sessionToken, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60,
      path: "/",
    });
    return res;
  } catch (err) {
    console.error("[Auth] Register error:", err);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}