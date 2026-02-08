import { NextResponse } from "next/server";

import { nowIso } from "@/lib/time";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ ok: true, time: nowIso() });
}

