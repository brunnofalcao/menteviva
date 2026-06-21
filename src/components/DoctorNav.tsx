"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/medico", label: "Visão geral", icon: <><rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" /></> },
  { href: "/medico/pacientes", label: "Pacientes", icon: <><circle cx="9" cy="8" r="3" /><path d="M3 20c0-3.3 2.7-5 6-5s6 1.7 6 5" /><circle cx="17.5" cy="9" r="2" /></> },
  { href: "/medico/config", label: "Lembretes & módulos", icon: <><path d="M6 8a6 6 0 0112 0c0 7 3 7 3 9H3c0-2 3-2 3-9" /><path d="M10 21h4" /></> },
  { href: "/medico/equipe", label: "Equipe & permissões", icon: <><circle cx="9" cy="8" r="3" /><path d="M3 20c0-3.3 2.7-5 6-5s6 1.7 6 5" /><circle cx="17.5" cy="9" r="2" /><path d="M21 20c0-2.5-1.8-4-4-4" /></> },
  { href: "/medico/marca", label: "Marca & whitelabel", icon: <><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></> },
];

export default function DoctorNav({ brandName, initial, docName, crm }: { brandName: string; initial: string; docName: string; crm: string }) {
  const path = usePathname();
  const initials = docName.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
  return (
    <aside style={side}>
      <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "4px 8px 22px" }}>
        <div style={logo}>{initial}</div>
        <div><b style={{ color: "#fff", fontSize: 16 }}>{brandName}</b><small style={{ display: "block", color: "#7d857e", fontSize: 10, fontWeight: 600 }}>PAINEL CLÍNICO</small></div>
      </div>
      {items.map((it) => {
        const on = it.href === "/medico" ? path === "/medico" : path.startsWith(it.href);
        return (
          <Link key={it.href} href={it.href} style={{ ...nav, ...(on ? navOn : {}) }}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">{it.icon}</svg>
            {it.label}
          </Link>
        );
      })}
      <div style={{ flex: 1 }} />
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 8px", borderTop: "1px solid rgba(255,255,255,.08)" }}>
        <div style={av}>{initials}</div>
        <div><b style={{ color: "#fff", fontSize: 13 }}>{docName}</b><small style={{ display: "block", color: "#7d857e", fontSize: 11 }}>{crm || "Psiquiatra"}</small></div>
      </div>
    </aside>
  );
}

const side: React.CSSProperties = { background: "#10160F", color: "#c2cbc4", padding: "22px 15px", display: "flex", flexDirection: "column", gap: 3 };
const logo: React.CSSProperties = { width: 36, height: 36, borderRadius: 11, background: "var(--accent)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 17 };
const nav: React.CSSProperties = { display: "flex", alignItems: "center", gap: 11, padding: "11px 12px", borderRadius: 11, fontSize: 14, fontWeight: 600, color: "#98a39c", textDecoration: "none" };
const navOn: React.CSSProperties = { background: "rgba(255,255,255,.09)", color: "#fff" };
const av: React.CSSProperties = { width: 34, height: 34, borderRadius: "50%", background: "var(--accent)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13 };
