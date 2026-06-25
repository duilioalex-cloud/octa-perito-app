import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({ status: "ok", application: "octa-perito-app", timestamp: new Date().toISOString() });
}
