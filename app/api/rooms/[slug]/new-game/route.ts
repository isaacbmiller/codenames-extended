import { NextResponse } from "next/server";

import { createNewGameForRoom } from "@/lib/room-service";

export async function POST(_: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;

  try {
    const room = await createNewGameForRoom(slug);
    return NextResponse.json({ room });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create a new game.";
    const status = message === "Room not found." ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
