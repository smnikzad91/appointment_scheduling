import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import MqttClient from "@/models/MqttClient";
import MqttActivity from "@/models/MqttActivity";
import MqttPayload from "@/models/MqttPayload";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id }      = await params;
  const body        = await req.json();
  const clientName  = ((body.clientName ?? "") as string).trim();

  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(clientName))
    return NextResponse.json({ error: "Client id must be 1-64 letters, numbers, - or _." }, { status: 400 });

  await connectDB();
  const client = await MqttClient.findOne({ _id: id, userId: session.user.id });
  if (!client) return NextResponse.json({ error: "Client not found." }, { status: 404 });

  const dup = await MqttClient.findOne({ mqttUserId: client.mqttUserId, clientName, _id: { $ne: id } });
  if (dup) return NextResponse.json({ error: "Client id already exists for this credential." }, { status: 409 });

  client.clientName = clientName;
  await client.save();
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  await connectDB();
  const client = await MqttClient.findOne({ _id: id, userId: session.user.id });
  if (!client) return NextResponse.json({ error: "Client not found." }, { status: 404 });

  await Promise.all([
    MqttActivity.deleteMany({ mqttUserId: client.mqttUserId, clientName: client.clientName }),
    MqttPayload.deleteMany({ mqttUserId: client.mqttUserId, clientName: client.clientName }),
    client.deleteOne(),
  ]);

  return NextResponse.json({ ok: true });
}
