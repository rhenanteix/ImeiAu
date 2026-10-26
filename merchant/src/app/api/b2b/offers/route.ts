import { NextRequest } from "next/server";
import { handle } from "@/lib/api";

export const runtime = "nodejs";
export const GET = handle;
export const POST = handle;
