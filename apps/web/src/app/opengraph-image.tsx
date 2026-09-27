import { ImageResponse } from "next/og";

export const alt = "mqttcloud.ir — MQTT Broker as a Service";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #12107a 0%, #1e1b8b 30%, #2d35c9 60%, #1a1860 100%)",
          position: "relative",
          overflow: "hidden",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Dot grid */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />

        {/* Top glow orb */}
        <div
          style={{
            position: "absolute",
            top: -120,
            left: "50%",
            transform: "translateX(-50%)",
            width: 600,
            height: 400,
            borderRadius: "50%",
            background: "rgba(70,95,255,0.25)",
            filter: "blur(80px)",
          }}
        />

        {/* Left orb */}
        <div
          style={{
            position: "absolute",
            top: "30%",
            left: -80,
            width: 300,
            height: 300,
            borderRadius: "50%",
            background: "rgba(117,146,255,0.15)",
            filter: "blur(60px)",
          }}
        />

        {/* Right orb */}
        <div
          style={{
            position: "absolute",
            top: "30%",
            right: -80,
            width: 300,
            height: 300,
            borderRadius: "50%",
            background: "rgba(99,102,241,0.15)",
            filter: "blur(60px)",
          }}
        />

        {/* Floating indicator cards — left */}
        <div
          style={{
            position: "absolute",
            left: 48,
            top: "50%",
            transform: "translateY(-50%)",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          {[
            { name: "device-1", value: "Connected", up: true },
            { name: "device-2", value: "Connected", up: true },
            { name: "device-3", value: "Connected", up: true },
          ].map((ind) => (
            <div
              key={ind.name}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 18,
                padding: "16px 22px",
                backdropFilter: "blur(10px)",
                minWidth: 180,
              }}
            >
              <span style={{ fontSize: 17, fontWeight: 700, color: "rgba(255,255,255,0.5)" }}>{ind.name}</span>
              <span style={{ fontSize: 20, fontWeight: 800, color: "white" }}>{ind.value}</span>
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#4ade80",
                  background: "rgba(74,222,128,0.15)",
                  borderRadius: 8,
                  padding: "3px 8px",
                }}
              >
                ↑
              </span>
            </div>
          ))}
        </div>

        {/* Floating indicator cards — right */}
        <div
          style={{
            position: "absolute",
            right: 48,
            top: "50%",
            transform: "translateY(-50%)",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          {[
            { name: "Broker Uptime", value: "99.9%", up: true },
            { name: "Avg. Latency", value: "50ms", up: true },
            { name: "Encryption", value: "TLS", up: true },
          ].map((ind) => (
            <div
              key={ind.name}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.10)",
                borderRadius: 18,
                padding: "16px 22px",
                minWidth: 200,
              }}
            >
              <span style={{ fontSize: 17, fontWeight: 700, color: "rgba(255,255,255,0.4)" }}>{ind.name}</span>
              <span style={{ fontSize: 20, fontWeight: 800, color: "rgba(255,255,255,0.85)" }}>{ind.value}</span>
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: ind.up ? "#4ade80" : "#f87171",
                  background: ind.up ? "rgba(74,222,128,0.15)" : "rgba(248,113,113,0.15)",
                  borderRadius: 8,
                  padding: "3px 8px",
                }}
              >
                {ind.up ? "↑" : "↓"}
              </span>
            </div>
          ))}
        </div>

        {/* Center content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 0,
            zIndex: 10,
          }}
        >
          {/* Logo mark */}
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 20,
              background: "linear-gradient(135deg, #465fff, #3641f5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 36,
              fontWeight: 900,
              color: "white",
              boxShadow: "0 8px 32px rgba(70,95,255,0.5)",
              marginBottom: 24,
            }}
          >
            M
          </div>

          {/* Brand name */}
          <div
            style={{
              fontSize: 56,
              fontWeight: 900,
              color: "white",
              letterSpacing: "-1px",
              lineHeight: 1,
            }}
          >
            mqttcloud.ir
          </div>

          {/* Tagline */}
          <div
            style={{
              fontSize: 22,
              fontWeight: 500,
              color: "rgba(165,180,252,0.9)",
              marginTop: 14,
              letterSpacing: "0.3px",
            }}
          >
            MQTT Broker as a Service
          </div>

          {/* Alert badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginTop: 20,
              background: "rgba(70,95,255,0.2)",
              border: "1px solid rgba(70,95,255,0.4)",
              borderRadius: 100,
              padding: "8px 20px",
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#4ade80",
              }}
            />
            <span style={{ fontSize: 15, fontWeight: 600, color: "rgba(255,255,255,0.8)" }}>
              Real-time pub/sub — secured with TLS
            </span>
          </div>

          {/* Feature pills */}
          <div
            style={{
              display: "flex",
              gap: 10,
              marginTop: 28,
            }}
          >
            {["Low Latency", "TLS Encrypted", "Per-Account Topics"].map((f) => (
              <div
                key={f}
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "rgba(255,255,255,0.65)",
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 100,
                  padding: "6px 14px",
                }}
              >
                {f}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom URL bar */}
        <div
          style={{
            position: "absolute",
            bottom: 32,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ fontSize: 16, fontWeight: 600, color: "rgba(255,255,255,0.35)", letterSpacing: "1px" }}>
            mqttcloud.ir
          </span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
