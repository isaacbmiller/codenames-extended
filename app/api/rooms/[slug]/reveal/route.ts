import { NextResponse } from "next/server";

import { revealCardForRoom } from "@/lib/room-service";

export async function POST(request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;

  try {
    const body = (await request.json()) as { cardId?: string };

    if (!body.cardId) {
      return NextResponse.json({ error: "cardId is required." }, { status: 400 });
    }

    const room = await revealCardForRoom(slug, body.cardId);
    return NextResponse.json({ room });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to reveal card.";
    const status = message.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
