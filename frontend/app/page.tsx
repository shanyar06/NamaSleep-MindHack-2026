"use client";

import Link from "next/link";

const C = {
  bg: "#f5f6f9",
  surface: "#ffffff",
  border: "#e4e7ef",
  text: "#111827",
  sub: "#64748b",
  accent: "#2563eb",
  accentBg: "#eff6ff",
  accentLight: "#bfdbfe",
};

export default function HomePage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'DM Sans', sans-serif",
        padding: 24,
      }}
    >
      <div style={{ width: "100%", maxWidth: 420 }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div
            style={{
              width: 56,
              height: 56,
              background: C.accentBg,
              border: `1.5px solid ${C.accentLight}`,
              borderRadius: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 26,
              margin: "0 auto 16px",
            }}
          >
            🌙
          </div>

          <h1 style={{ fontSize: 24, fontWeight: 700, color: C.text }}>
            Sleep LLM
          </h1>

          <p style={{ fontSize: 13, color: C.sub, marginTop: 6 }}>
            Human-in-the-loop insomnia risk triage powered by wearable-informed sleep signals
          </p>
        </div>

        {/* Cards */}
        {/* Cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          {/* Patient */}
          <div style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 50,
            boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
          }}>
            <Link
              href="/patientPortal"
              style={{
                display: "block",
                width: "100%",
                background: C.accent,
                color: "#fff",
                textAlign: "center",
                padding: "12px",
                borderRadius: 10,
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Continue as Patient
            </Link>
          </div>

          {/* Doctor */}
          <div style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 50,
            boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
          }}>
            <Link
              href="/doctorPortal"
              style={{
                display: "block",
                width: "100%",
                background: "#fff", //
                color: C.text,
                textAlign: "center",
                padding: "12px",
                borderRadius: 10,
                fontWeight: 600,
                textDecoration: "none",
                border: `1px solid ${C.border}`, // 
              }}
            >
              Continue as Doctor
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}