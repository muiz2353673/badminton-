import { NextRequest, NextResponse } from "next/server";

const ADMIN_USERNAME = process.env.ADMIN_USERNAME ?? "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "password@12345";
const COOKIE_NAME = "admin_logged_in";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const username = String(body?.username ?? "").trim();
    const password = String(body?.password ?? "");

    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      const res = NextResponse.json({ ok: true });
      res.cookies.set(COOKIE_NAME, "1", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: COOKIE_MAX_AGE,
        path: "/",
      });
      return res;
    }
  } catch {
    // ignore
  }
  return NextResponse.json({ ok: false }, { status: 401 });
}
