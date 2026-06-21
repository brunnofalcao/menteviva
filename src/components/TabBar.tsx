"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/app", label: "Hoje", icon: <path d="M3 11.5 12 4l9 7.5M5 10v10h5v-6h4v6h5V10" /> },
  { href: "/app/jornada", label: "Jornada", icon: <><path d="M4 18 9 12l3 3 8-9" /><path d="M4 20h16" opacity=".4" /></> },
  { href: "/app/medicamentos", label: "Remédios", icon: <><rect x="4" y="9" width="16" height="6" rx="3" /><path d="M9 9v6" opacity=".5" /></> },
  { href: "/app/perfil", label: "Perfil", icon: <><circle cx="12" cy="8" r="3.4" /><path d="M5.5 20c0-3.6 3-5.5 6.5-5.5s6.5 1.9 6.5 5.5" /></> },
];

export default function TabBar() {
  const path = usePathname();
  return (
    <nav style={bar}>
      {tabs.map((t) => {
        const on = t.href === "/app" ? path === "/app" : path.startsWith(t.href);
        return (
          <Link key={t.href} href={t.href} style={{ ...tab, color: on ? "var(--accent)" : "#A4A8B2" }}>
            <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{t.icon}</svg>
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}

const bar: React.CSSProperties = {
  position: "fixed", left: "max(18px, calc(50% - 202px))", right: "max(18px, calc(50% - 202px))",
  bottom: 14, height: 60, zIndex: 30, display: "flex", alignItems: "center", padding: "0 8px",
  background: "rgba(255,255,255,.72)", backdropFilter: "blur(24px) saturate(2)",
  WebkitBackdropFilter: "blur(24px) saturate(2)", borderRadius: 34,
  boxShadow: "0 8px 30px rgba(0,0,0,.16), inset 0 0 0 .5px rgba(255,255,255,.5)",
};
const tab: React.CSSProperties = {
  flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
  fontSize: 10, fontWeight: 700, textDecoration: "none", padding: "6px 0",
};
