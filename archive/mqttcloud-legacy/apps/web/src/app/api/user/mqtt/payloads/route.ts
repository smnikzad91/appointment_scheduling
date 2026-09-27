import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import MqttPayload from "@/models/MqttPayload";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const clientName = req.nextUrl.searchParams.get("clientName");

  await connectDB();
  const query: Record<string, unknown> = { userId: session.user.id };
  if (clientName) query.clientName = clientName;

  const payloads = await MqttPayload.find(query)
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  return NextResponse.json(
    payloads.map((p) => ({
      id:         p._id,
      clientName: p.clientName,
      topic:      p.topic,
      payload:    p.payload,
      createdAt:  p.createdAt,
    }))
  );
}
