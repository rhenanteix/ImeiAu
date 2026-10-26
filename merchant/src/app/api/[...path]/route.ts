import { NextRequest, NextResponse } from "next/server";
import { handle } from "@/lib/api";
export const runtime = "nodejs";
export const GET = handle,
  POST = handle,
  PATCH = handle,
  DELETE = handle;
export function OPTIONS(req: NextRequest) {
  const origin = req.headers.get("origin") || "";
  if (
    !req.nextUrl.pathname.startsWith("/api/v1/") ||
    !(process.env.ALLOWED_ORIGINS || "").split(",").includes(origin)
  )
    return new NextResponse(null, { status: 403 });
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type,Idempotency-Key",
      Vary: "Origin",
    },
  });
}
