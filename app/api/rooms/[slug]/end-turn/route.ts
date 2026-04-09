import { NextResponse } from "next/server";

import { endTurnForRoom } from "@/lib/room-service";

export async function POST(_: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;

  try {
    const room = await endTurnForRoom(slug);
    return NextResponse.json({ room });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to end turn.";
    const status = message.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
