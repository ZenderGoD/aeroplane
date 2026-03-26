import { NextResponse } from "next/server";
import { getAllActiveTurnarounds, getRecentTurnarounds } from "@/lib/db/queries";

export async function GET() {
  const [active, recent] = await Promise.all([
    getAllActiveTurnarounds(100),
    getRecentTurnarounds(50),
  ]);

  return NextResponse.json({ active, recent });
}
