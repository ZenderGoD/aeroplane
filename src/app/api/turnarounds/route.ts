import { NextResponse } from "next/server";

export async function GET() {
  try {
    const { getAllActiveTurnarounds, getRecentTurnarounds } = await import(
      "@/lib/db/queries"
    );

    const [active, recent] = await Promise.all([
      getAllActiveTurnarounds(100),
      getRecentTurnarounds(50),
    ]);

    return NextResponse.json({ active, recent });
  } catch {
    return NextResponse.json({ turnarounds: [] });
  }
}
