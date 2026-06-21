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
  const vars = `:root{--accent:${accent};}`;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: vars }} />
      <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", minHeight: "100vh", background: "#F4F5F4" }}>
        <DoctorNav brandName={brandName} initial={initial} docName={docName} crm={crm} />
        <main style={{ overflow: "auto" }}>{children}</main>
      </div>
    </>
  );
}
