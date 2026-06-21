"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

const items = [
  { href: "/medico", label: "Visão geral", short: "Início", icon: <><rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" /></> },
  { href: "/medico/pacientes", label: "Pacientes", short: "Pacientes", icon: <><circle cx="9" cy="8" r="3" /><path d="M3 20c0-3.3 2.7-5 6-5s6 1.7 6 5" /><circle cx="17.5" cy="9" r="2" /></> },
  { href: "/medico/config", label: "Mensagens", short: "Mensagens", icon: <><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" /></> },
  { href: "/medico/equipe", label: "Equipe & permissões", short: "Equipe", icon: <><circle cx="9" cy="8" r="3" /><path d="M3 20c0-3.3 2.7-5 6-5s6 1.7 6 5" /><circle cx="17.5" cy="9" r="2" /><path d="M21 20c0-2.5-1.8-4-4-4" /></> },
  { href: "/medico/marca", label: "Marca & whitelabel", short: "Marca", icon: <><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></> },
];

function isActive(path: string, href: string) {
  return href === "/medico" ? path === "/medico" : path.startsWith(href);
}

export default function DoctorNav({ brandName, initial, docName, crm }: { brandName: string; initial: string; docName: string; crm: string }) {
  const path = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const initials = docName.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <>
      {/* ===== SIDEBAR (desktop) ===== */}
      <aside className="mv-sidebar" style={side}>
        <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "4px 8px 22px" }}>
          <div style={logo}>{initial}</div>
          <div><b style={{ color: "#fff", fontSize: 16 }}>{brandName}</b><small style={{ display: "block", color: "#7d857e", fontSize: 10, fontWeight: 600 }}>PAINEL CLÍNICO</small></div>
        </div>
        {items.map((it) => {
          const on = isActive(path, it.href);
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
          <div style={{ flex: 1, minWidth: 0 }}><b style={{ color: "#fff", fontSize: 13 }}>{docName}</b><small style={{ display: "block", color: "#7d857e", fontSize: 11 }}>{crm || "Psiquiatra"}</small></div>
          <button onClick={logout} aria-label="Sair" title="Sair" style={{ background: "rgba(255,255,255,.06)", border: "none", borderRadius: 9, padding: "8px 9px", cursor: "pointer", color: "#98a39c" }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></svg>
          </button>
        </div>
      </aside>

      {/* ===== TOPBAR (mobile) ===== */}
      <header className="mv-topbar" style={topbar}>
        <div style={{ ...logo, width: 32, height: 32, fontSize: 15 }}>{initial}</div>
        <b style={{ fontSize: 16 }}>{brandName}</b>
        <div style={{ flex: 1 }} />
        <button onClick={logout} aria-label="Sair" style={{ display: "flex", alignItems: "center", gap: 7, background: "#F4F5F4", border: "none", borderRadius: 10, padding: "7px 11px", cursor: "pointer", color: "#646B67", fontWeight: 600, fontSize: 13 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></svg>
          Sair
        </button>
      </header>

      {/* ===== TAB BAR (mobile) ===== */}
      <nav className="mv-tabbar" style={tabbar}>
        {items.map((it) => {
          const on = isActive(path, it.href);
          return (
            <Link key={it.href} href={it.href} style={{ ...tab, color: on ? "var(--accent)" : "#8A9591" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">{it.icon}</svg>
              <span style={{ fontSize: 10.5, fontWeight: 600 }}>{it.short}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}

const side: React.CSSProperties = { background: "#10160F", color: "#c2cbc4", padding: "22px 15px", flexDirection: "column", gap: 3, position: "sticky", top: 0, height: "100vh", overflowY: "auto", flexShrink: 0 };
const logo: React.CSSProperties = { width: 36, height: 36, borderRadius: 11, background: "var(--accent)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 17, flexShrink: 0 };
const nav: React.CSSProperties = { display: "flex", alignItems: "center", gap: 11, padding: "11px 12px", borderRadius: 11, fontSize: 14, fontWeight: 600, color: "#98a39c", textDecoration: "none" };
const navOn: React.CSSProperties = { background: "rgba(255,255,255,.09)", color: "#fff" };
const av: React.CSSProperties = { width: 34, height: 34, borderRadius: "50%", background: "var(--accent)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13, flexShrink: 0 };

const topbar: React.CSSProperties = { alignItems: "center", gap: 10, padding: "12px 16px", background: "#fff", borderBottom: "1px solid #E7E9E7", position: "sticky", top: 0, zIndex: 20 };
const tabbar: React.CSSProperties = { position: "fixed", bottom: 0, left: 0, right: 0, background: "rgba(255,255,255,.92)", backdropFilter: "saturate(180%) blur(20px)", WebkitBackdropFilter: "saturate(180%) blur(20px)", borderTop: "1px solid #E7E9E7", justifyContent: "space-around", padding: "8px 4px 22px", zIndex: 20 };
const tab: React.CSSProperties = { display: "flex", flexDirection: "column", alignItems: "center", gap: 3, textDecoration: "none", flex: 1, padding: "2px 0" };
