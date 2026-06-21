import Link from "next/link";

const GROUPS = [
  {
    title: "Conta e identidade",
    items: [
      { href: "/medico/marca", label: "Dados e identidade", desc: "Nome, CRM, especialidades e RQE, identidade visual", icon: "⚙️" },
      { href: "/medico/equipe", label: "Equipe e permissões", desc: "Membros da equipe e o que cada um pode ver", icon: "👥" },
    ],
  },
  {
    title: "Comunicação",
    items: [
      { href: "/medico/config", label: "Mensagens", desc: "Mensagens para os pacientes", icon: "💬" },
      { href: "/medico/whatsapp", label: "WhatsApp", desc: "Lembretes e alertas automáticos pelo WhatsApp", icon: "🟢" },
    ],
  },
];

export default function ConfiguracoesHub() {
  return (
    <div className="mv-page" style={{ maxWidth: 760 }}>
      <div style={{ fontSize: 12.5, color: "#9BA29D", fontWeight: 600 }}>Configurações</div>
      <h1 className="mv-title" style={{ fontSize: 30, fontWeight: 700, margin: "6px 0 4px" }}>Configurações</h1>
      <p style={{ color: "#646B67", fontSize: 14, marginBottom: 24 }}>Tudo num só lugar: sua conta, equipe e canais de comunicação.</p>

      {GROUPS.map((g) => (
        <div key={g.title} style={{ marginBottom: 26 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#9BA29D", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 11 }}>{g.title}</div>
          <div style={{ display: "grid", gap: 10 }}>
            {g.items.map((it) => (
              <Link key={it.href} href={it.href} style={{
                display: "flex", alignItems: "center", gap: 14, padding: "16px 18px",
                background: "#fff", border: "1px solid #E7E9E7", borderRadius: 14, textDecoration: "none", color: "inherit",
              }}>
                <span style={{ fontSize: 22 }}>{it.icon}</span>
                <div style={{ flex: 1 }}>
                  <b style={{ fontSize: 15 }}>{it.label}</b>
                  <div style={{ fontSize: 12.5, color: "#646B67" }}>{it.desc}</div>
                </div>
                <span style={{ color: "#C4C9C5", fontSize: 20 }}>›</span>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
