import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import MqttUser from "@/models/MqttUser";
import MqttClient from "@/models/MqttClient";
import MqttActivity from "@/models/MqttActivity";
import MqttPayload from "@/models/MqttPayload";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body     = await req.json();

  await connectDB();
  const credential = await MqttUser.findOne({ _id: id, userId: session.user.id });
  if (!credential) return NextResponse.json({ error: "Credential not found." }, { status: 404 });

  if (typeof body.isActive === "boolean") credential.isActive = body.isActive;

  if (typeof body.password === "string" && body.password.length > 0) {
    if (body.password.length < 6)
      return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
    credential.password = await bcrypt.hash(body.password, 12);
  }

  await credential.save();
  return NextResponse.json({ ok: true, isActive: credential.isActive });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  await connectDB();
  const credential = await MqttUser.findOne({ _id: id, userId: session.user.id });
  if (!credential) return NextResponse.json({ error: "Credential not found." }, { status: 404 });

  await Promise.all([
    MqttClient.deleteMany({ mqttUserId: credential._id }),
    MqttActivity.deleteMany({ mqttUserId: credential._id }),
    MqttPayload.deleteMany({ mqttUserId: credential._id }),
    credential.deleteOne(),
  ]);

  return NextResponse.json({ ok: true });
}
