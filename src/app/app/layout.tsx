import { createServerSupabase } from "@/lib/supabase-server";
import TabBar from "@/components/TabBar";

// Deriva tons soft/ink a partir do accent (simplificado; produção pode usar OKLCH).
function deriveSoft(hex: string) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  const mix = (c: number) => Math.round(c + (255 - c) * 0.88);
  return `rgb(${mix(r)},${mix(g)},${mix(b)})`;
}
function deriveInk(hex: string) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  const dark = (c: number) => Math.round(c * 0.45);
  return `rgb(${dark(r)},${dark(g)},${dark(b)})`;
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  // marca do médico vinculado ao paciente
  let accent = "#3B7A6B", brandName = "Mente Viva";
  if (user) {
    const { data } = await supabase
      .from("patients")
      .select("doctors(brand_accent, brand_name)")
      .eq("id", user.id)
      .single();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const doc: any = data?.doctors;
    if (doc?.brand_accent) accent = doc.brand_accent;
    if (doc?.brand_name) brandName = doc.brand_name;
  }

  const vars = `:root{--accent:${accent};--accent-soft:${deriveSoft(accent)};--accent-ink:${deriveInk(accent)};}`;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: vars }} />
      <div data-brand={brandName} style={{ minHeight: "100vh", paddingBottom: 90 }}>
        {children}
      </div>
      <TabBar />
    </>
  );
}
