import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import MqttUser from "@/models/MqttUser";
import MqttClient from "@/models/MqttClient";
import MqttActivity from "@/models/MqttActivity";
import MqttPayload from "@/models/MqttPayload";

// Admin can only suspend/unsuspend a credential set — password rotation stays user-only.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body   = await req.json();

  if (typeof body.isActive !== "boolean")
    return NextResponse.json({ error: "isActive is required." }, { status: 400 });

  await connectDB();
  const credential = await MqttUser.findByIdAndUpdate(id, { isActive: body.isActive }, { new: true });
  if (!credential) return NextResponse.json({ error: "Credential not found." }, { status: 404 });

  return NextResponse.json({ ok: true, isActive: credential.isActive });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  await connectDB();
  const credential = await MqttUser.findById(id);
  if (!credential) return NextResponse.json({ error: "Credential not found." }, { status: 404 });

  await Promise.all([
    MqttClient.deleteMany({ mqttUserId: credential._id }),
    MqttActivity.deleteMany({ mqttUserId: credential._id }),
    MqttPayload.deleteMany({ mqttUserId: credential._id }),
    credential.deleteOne(),
  ]);

  return NextResponse.json({ ok: true });
}
