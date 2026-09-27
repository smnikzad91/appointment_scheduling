import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import MqttActivity from "@/models/MqttActivity";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const activity = await MqttActivity.find({ userId: session.user.id })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  return NextResponse.json(
    activity.map((a) => ({
      id:         a._id,
      clientName: a.clientName,
      event:      a.event,
      createdAt:  a.createdAt,
    }))
  );
}
