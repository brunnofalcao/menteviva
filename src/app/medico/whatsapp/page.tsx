import { createServerSupabase } from "@/lib/supabase-server";
import WhatsappForm from "./WhatsappForm";

export default async function WhatsappPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: cfg } = user
    ? await supabase.from("whatsapp_config").select("*").eq("doctor_id", user.id).maybeSingle()
    : { data: null };

  // contadores da fila (pra mostrar que a estrutura está viva)
  const { count: queued } = await supabase
    .from("notifications").select("*", { count: "exact", head: true })
    .eq("channel", "whatsapp").eq("status", "queued");
  const { count: sent } = await supabase
    .from("notifications").select("*", { count: "exact", head: true })
    .eq("channel", "whatsapp").eq("status", "sent");

  return (
    <div className="mv-page" style={{ maxWidth: 760 }}>
      <div style={{ fontSize: 12.5, color: "#9BA29D", fontWeight: 600 }}>Integrações</div>
      <h1 className="mv-title" style={{ fontSize: 30, fontWeight: 700, margin: "6px 0 4px" }}>WhatsApp</h1>
      <p style={{ color: "#646B67", fontSize: 14, marginBottom: 20 }}>
        Lembretes e alertas pelo WhatsApp. A estrutura está pronta — conecte as credenciais da Meta para ativar o envio.
      </p>

      {/* status de conexão */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", borderRadius: 14, marginBottom: 18,
        background: cfg?.connected ? "#EAF7F0" : "#FAF5E9",
        border: `1px solid ${cfg?.connected ? "#BfE5D0" : "#E6D9B8"}`,
      }}>
        <span style={{ fontSize: 22 }}>{cfg?.connected ? "🟢" : "🟡"}</span>
        <div style={{ flex: 1 }}>
          <b style={{ fontSize: 14.5 }}>{cfg?.connected ? "Conectado e enviando" : "Estrutura pronta — aguardando conexão"}</b>
          <div style={{ fontSize: 12.5, color: "#646B67" }}>
            {cfg?.connected
              ? "As notificações na fila serão enviadas automaticamente."
              : "Os alertas já estão sendo enfileirados. Assim que você plugar o número, eles começam a sair."}
          </div>
        </div>
      </div>

      {/* fila viva */}
      <div style={{ display: "flex", gap: 12, marginBottom: 22 }}>
        <div style={stat}><div style={statN}>{queued ?? 0}</div><div style={statL}>Na fila</div></div>
        <div style={stat}><div style={statN}>{sent ?? 0}</div><div style={statL}>Enviadas</div></div>
      </div>

      <WhatsappForm cfg={cfg} />
    </div>
  );
}

const stat: React.CSSProperties = { flex: 1, background: "#fff", border: "1px solid #E7E9E7", borderRadius: 14, padding: "16px", textAlign: "center" };
const statN: React.CSSProperties = { fontSize: 28, fontWeight: 800, color: "#1A1D1C" };
const statL: React.CSSProperties = { fontSize: 12, color: "#646B67", fontWeight: 600, marginTop: 3 };
