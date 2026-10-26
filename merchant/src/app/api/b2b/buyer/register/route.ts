import { NextRequest } from "next/server";
import { handle } from "@/lib/api";

export const runtime = "nodejs";
export const POST = handle;
