import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import MqttClient from "@/models/MqttClient";
import MqttUser from "@/models/MqttUser";
import User from "@/models/User";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await connectDB();
  void MqttUser;
  void User;

  const clients = await MqttClient.find()
    .sort({ createdAt: -1 })
    .populate("userId", "firstName lastName email")
    .populate("mqttUserId", "username")
    .lean();

  return NextResponse.json(
    clients.map((c) => {
      const u    = c.userId as unknown as { firstName?: string; lastName?: string; email?: string } | null;
      const cred = c.mqttUserId as unknown as { username?: string } | null;
      return {
        id:         c._id,
        clientName: c.clientName,
        isOnline:   c.isOnline,
        lastSeenAt: c.lastSeenAt,
        createdAt:  c.createdAt,
        username:   cred?.username ?? "",
        user: u ? { name: `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim(), email: u.email ?? "" } : null,
      };
    })
  );
}
