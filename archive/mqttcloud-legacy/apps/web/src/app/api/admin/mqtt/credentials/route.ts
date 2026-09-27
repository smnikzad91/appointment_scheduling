import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import MqttUser from "@/models/MqttUser";
import User from "@/models/User";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await connectDB();
  void User;

  const credentials = await MqttUser.find()
    .sort({ createdAt: -1 })
    .select("-password")
    .populate("userId", "firstName lastName email")
    .lean();

  return NextResponse.json(
    credentials.map((c) => {
      const u = c.userId as unknown as { firstName?: string; lastName?: string; email?: string } | null;
      return {
        id:            c._id,
        username:      c.username,
        isActive:      c.isActive,
        maxConnection: c.maxConnection,
        createdAt:     c.createdAt,
        user: u ? { name: `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim(), email: u.email ?? "" } : null,
      };
    })
  );
}
