import { NextResponse } from "next/server";

import { createRoom } from "@/lib/room-service";

export async function POST(request: Request) {
  try {
    let body: { slug?: string } | null = null;

    try {
      body = (await request.json()) as { slug?: string };
    } catch {}

    const room = await createRoom(body?.slug);
    return NextResponse.json({ room });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create room.";
    const status = message === "Room slug must include letters or numbers." ? 400 : 500;

    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}
