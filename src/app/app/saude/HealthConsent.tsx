"use client";
import { useState, useEffect } from "react";
import { setHealthConsent } from "./actions";

// detecta a plataforma pelo user agent
function detectPlatform(): { key: string; name: string; icon: string } {
  if (typeof navigator === "undefined") return { key: "unknown", name: "Saúde Conectada", icon: "❤️" };
  const ua = navigator.userAgent || "";
  if (/iPhone|iPad|iPod/i.test(ua)) return { key: "apple_health", name: "Apple Saúde", icon: "🍎" };
  if (/Android/i.test(ua)) return { key: "health_connect", name: "Health Connect", icon: "🤖" };
  return { key: "unknown", name: "Saúde Conectada", icon: "❤️" };
}

export default function HealthConsent({ consent }: { consent: boolean }) {
  const [on, setOn] = useState(consent);
  const [busy, setBusy] = useState(false);
  const [plat, setPlat] = useState({ key: "unknown", name: "Saúde Conectada", icon: "❤️" });

  useEffect(() => { setPlat(detectPlatform()); }, []);

  async function toggle() {
    setBusy(true);
    const next = !on;
    setOn(next);
    await setHealthConsent(next, next ? plat.key : null);
    setBusy(false);
  }

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 14, padding: 16, borderRadius: 16,
      background: on ? "#EAF7F0" : "#fff", border: `1px solid ${on ? "#BfE5D0" : "#E7E9E7"}`,
    }}>
      <span style={{ fontSize: 26 }}>{on ? "💚" : plat.icon}</span>
      <div style={{ flex: 1 }}>
        <b style={{ fontSize: 15 }}>{plat.name}</b>
        <div style={{ fontSize: 12.5, color: "#646B67" }}>
          {on
            ? "Conectado. Seus sinais ajudam seu médico a cuidar melhor de você."
            : `Permita a leitura passiva de sono, passos e batimentos pelo ${plat.name}.`}
        </div>
      </div>
      <button onClick={toggle} disabled={busy} style={{
        width: 52, height: 30, borderRadius: 15, border: "none", cursor: "pointer", position: "relative",
        background: on ? "var(--accent)" : "#D5D7D5", transition: "background .2s", flexShrink: 0,
      }}>
        <span style={{
          position: "absolute", top: 3, left: on ? 25 : 3, width: 24, height: 24, borderRadius: "50%",
          background: "#fff", transition: "left .2s", boxShadow: "0 1px 3px rgba(0,0,0,.2)",
        }} />
      </button>
    </div>
  );
}
