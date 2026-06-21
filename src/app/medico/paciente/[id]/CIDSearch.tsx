"use client";
import { useState, useRef, useEffect } from "react";
import { searchCID, setDiagnosisWithCID } from "./diagnosis-actions";

type CID = { code: string; description: string; chapter: string; version: string };

export default function CIDSearch({ patientId, current, currentCode }: { patientId: string; current: string | null; currentCode: string | null }) {
  const [version, setVersion] = useState("10");
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<CID[]>([]);
  const [selected, setSelected] = useState<{ code: string; description: string } | null>(
    current ? { code: currentCode ?? "", description: current } : null
  );
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (term.trim().length < 2) { setResults([]); return; }
    timer.current = setTimeout(async () => {
      const r = await searchCID(term, version);
      setResults(r);
      setOpen(true);
    }, 250);
  }, [term, version]);

  async function choose(c: CID) {
    setSelected({ code: c.code, description: c.description });
    setTerm("");
    setResults([]);
    setOpen(false);
    setSaving(true);
    await setDiagnosisWithCID(patientId, c.description, c.code, c.version);
    setSaving(false);
  }

  return (
    <div>
      {/* diagnóstico atual */}
      {selected && (
        <div style={{ display: "flex", alignItems: "center", gap: 11, background: "var(--accent-soft, #EEF3F1)", borderRadius: 12, padding: "12px 14px", marginBottom: 12 }}>
          {selected.code && <span style={{ fontWeight: 800, fontSize: 13, color: "var(--accent-ink, #2C6BBF)", fontFamily: "monospace" }}>{selected.code}</span>}
          <span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{selected.description}</span>
          {saving && <span style={{ fontSize: 12, color: "#9BA29D" }}>salvando…</span>}
        </div>
      )}

      {/* seletor de versão + busca */}
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <div style={{ display: "flex", borderRadius: 9, overflow: "hidden", border: "1px solid #E7E9E7" }}>
          {["10", "11"].map((v) => (
            <button key={v} type="button" onClick={() => setVersion(v)} style={{
              padding: "0 12px", border: "none", fontSize: 12.5, fontWeight: 700, cursor: "pointer",
              background: version === v ? "#1A1D1C" : "#fff", color: version === v ? "#fff" : "#646B67",
            }}>CID-{v}</button>
          ))}
        </div>
        <div style={{ position: "relative", flex: 1 }}>
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            onFocus={() => results.length && setOpen(true)}
            placeholder="Buscar por código ou nome (ex.: F41 ou ansiedade)"
            style={{ width: "100%", border: "1px solid #E7E9E7", borderRadius: 10, padding: "11px 13px", fontSize: 14 }}
          />
          {open && results.length > 0 && (
            <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "#fff", border: "1px solid #E7E9E7", borderRadius: 12, boxShadow: "0 8px 30px rgba(0,0,0,.12)", zIndex: 30, maxHeight: 280, overflow: "auto" }}>
              {results.map((c) => (
                <button key={c.code} type="button" onClick={() => choose(c)} style={{
                  display: "flex", gap: 11, alignItems: "center", width: "100%", textAlign: "left",
                  padding: "11px 14px", border: "none", borderBottom: "1px solid #F0F1F0", background: "#fff", cursor: "pointer",
                }}>
                  <span style={{ fontWeight: 800, fontSize: 12.5, color: "var(--accent-ink, #2C6BBF)", fontFamily: "monospace", minWidth: 48 }}>{c.code}</span>
                  <span style={{ fontSize: 13.5 }}>{c.description}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <p style={{ fontSize: 12.5, color: "#646B67" }}>
        Busque pelo código CID ou pelo nome do diagnóstico. CID-10 é o padrão; alterne para CID-11 se precisar.
      </p>
    </div>
  );
}
