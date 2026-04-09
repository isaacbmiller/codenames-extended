import { NextResponse } from "next/server";

import { fetchRoomStateBySlug } from "@/lib/room-service";

export async function GET(_: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;

  try {
    const room = await fetchRoomStateBySlug(slug);

    if (!room) {
      return NextResponse.json({ error: "Room not found." }, { status: 404 });
    }

    return NextResponse.json({ room });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch room." },
      { status: 500 }
    );
  }
}
