import { createServerSupabase } from "@/lib/supabase-server";
import DoctorNav from "@/components/DoctorNav";

export default async function MedicoLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  let brandName = "Mente Viva", accent = "#3B7A6B", docName = "Médico", crm = "";
  if (user) {
    const { data: doc } = await supabase
      .from("doctors").select("brand_name, brand_accent, crm").eq("id", user.id).single();
    const { data: prof } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
    if (doc?.brand_name) brandName = doc.brand_name;
    if (doc?.brand_accent) accent = doc.brand_accent;
    if (doc?.crm) crm = doc.crm;
    if (prof?.full_name) docName = prof.full_name;
  }

  const initial = (brandName[0] || "M").toUpperCase();

  // CSS real com media query: desktop = sidebar lateral; mobile = tab bar embaixo
  const css = `
    :root{ --accent:${accent}; }
    .mv-shell{ min-height:100vh; background:#F4F5F4; }
    .mv-main{ min-height:100vh; }
    /* DESKTOP (>= 768px): sidebar fixa à esquerda */
    @media (min-width: 768px){
      .mv-shell{ display:grid; grid-template-columns:248px 1fr; }
      .mv-sidebar{ display:flex; }
      .mv-tabbar{ display:none; }
      .mv-main{ overflow:auto; }
    }
    /* MOBILE (< 768px): conteúdo full + tab bar embaixo */
    @media (max-width: 767px){
      .mv-sidebar{ display:none; }
      .mv-topbar{ display:flex; }
      .mv-tabbar{ display:flex; }
      .mv-main{ padding-bottom:84px; }
    }
    @media (min-width: 768px){ .mv-topbar{ display:none; } }

    /* ---- utilitários responsivos das telas internas ---- */
    .mv-page{ padding:26px 32px 60px; max-width:1000px; }
    .mv-kpis{ display:grid; grid-template-columns:repeat(4,1fr); gap:14px; }
    .mv-split{ display:grid; grid-template-columns:1.5fr 1fr; gap:18px; }
    .mv-split-2{ display:grid; grid-template-columns:1.2fr 1fr; gap:18px; }
    .mv-row2{ display:flex; gap:10px; }
    .mv-hide-sm{ display:table-cell; }
    @media (max-width: 767px){
      .mv-page{ padding:18px 16px 40px; }
      .mv-kpis{ grid-template-columns:repeat(2,1fr); gap:10px; }
      .mv-split, .mv-split-2{ grid-template-columns:1fr; gap:14px; }
      .mv-row2{ flex-direction:column; }
      .mv-hide-sm{ display:none; }
      .mv-title{ font-size:24px !important; }
      .mv-row2-grid{ grid-template-columns:1fr !important; }
    }
  `;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div className="mv-shell">
        <DoctorNav brandName={brandName} initial={initial} docName={docName} crm={crm} />
        <main className="mv-main">{children}</main>
      </div>
    </>
  );
}
