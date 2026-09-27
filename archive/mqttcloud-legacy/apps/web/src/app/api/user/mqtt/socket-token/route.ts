import crypto from "crypto";
import { NextResponse } from "next/server";
import { auth } from "@/auth";

// Mints a short-lived token the browser hands to broker-service's Socket.IO
// server (see broker-service/src/socketToken.js) so it can join room
// `user:{userId}` and receive live connect/disconnect push — without the two
// separate processes needing to share session storage. Token shape:
//   base64url(JSON.stringify({ uid, exp })) + "." + hmacSha256(payload)
const SOCKET_SHARED_SECRET = process.env.SOCKET_SHARED_SECRET ?? "";
const TOKEN_TTL_MS = 5 * 60 * 1000;

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!SOCKET_SHARED_SECRET) return NextResponse.json({ error: "Live push is not configured" }, { status: 503 });

  const payload = JSON.stringify({ uid: session.user.id, exp: Date.now() + TOKEN_TTL_MS });
  const payloadB64 = Buffer.from(payload).toString("base64url");
  const sig = crypto.createHmac("sha256", SOCKET_SHARED_SECRET).update(payloadB64).digest("base64url");

  return NextResponse.json({ token: `${payloadB64}.${sig}` });
}
