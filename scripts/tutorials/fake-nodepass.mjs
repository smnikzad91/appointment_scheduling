// A stand-in for nodepass.ir's payment API, for the Help Center screenshots only: the demo web
// (scripts/tutorials/capture.mjs) gets NODEPASS_URL=http://127.0.0.1:3199 and NODEPASS_API_KEY=demo,
// so «افزایش موجودی» shows the real card-to-card screen without reaching nodepass. Payments stay
// PENDING (nothing is ever paid); the card is a made-up one.
//
//   node scripts/tutorials/fake-nodepass.mjs [port]

import { createServer } from "node:http";
import { randomUUID } from "node:crypto";

const PORT = Number(process.argv[2] ?? 3199);
const payments = new Map();

const json = (res, status, body) => {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
};

createServer((req, res) => {
  let raw = "";
  req.on("data", (c) => (raw += c));
  req.on("end", () => {
    const url = new URL(req.url, "http://x");
    if (req.method === "POST" && url.pathname === "/v1/payments") {
      const { amountToman, clientOrderId } = JSON.parse(raw || "{}");
      const offsetRial = 1 + Math.floor(Math.random() * 999);
      const p = {
        id: randomUUID(),
        merchantRef: clientOrderId,
        status: "PENDING",
        amountToman,
        offsetRial,
        payableRial: String(amountToman * 10 + offsetRial),
        paidRial: null,
        trackingCode: `NP${Date.now().toString().slice(-8)}`,
        card: { number: "6037991234567890", ownerName: "نوبتت (نمونه)", bankName: "ملی" },
        expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
        paidAt: null,
      };
      payments.set(p.id, p);
      return json(res, 201, p);
    }
    const m = url.pathname.match(/^\/v1\/payments\/([^/]+)(\/cancel)?$/);
    const p = m && payments.get(m[1]);
    if (!p) return json(res, 404, { error: "not_found", message: "not found" });
    if (m[2] && req.method === "POST") p.status = "CANCELLED";
    return json(res, 200, p);
  });
}).listen(PORT, "127.0.0.1", () => console.log(`fake nodepass on 127.0.0.1:${PORT}`));
