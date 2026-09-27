import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import MqttActivity from "@/models/MqttActivity";
import User from "@/models/User";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await connectDB();
  void User;

  const activity = await MqttActivity.find()
    .sort({ createdAt: -1 })
    .limit(200)
    .populate("userId", "firstName lastName email")
    .lean();

  return NextResponse.json(
    activity.map((a) => {
      const u = a.userId as unknown as { firstName?: string; lastName?: string; email?: string } | null;
      return {
        id:         a._id,
        clientName: a.clientName,
        event:      a.event,
        createdAt:  a.createdAt,
        user: u ? { name: `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim(), email: u.email ?? "" } : null,
      };
    })
  );
}
