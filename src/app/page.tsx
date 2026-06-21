import Link from "next/link";

export default function Home() {
  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: 26, textAlign: "center", maxWidth: 480, margin: "0 auto" }}>
      <div style={{ width: 64, height: 64, borderRadius: 20, background: "var(--accent)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, fontWeight: 800, marginBottom: 22 }}>M</div>
      <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-.03em", lineHeight: 1.1 }}>Mente Viva</h1>
      <p style={{ color: "var(--label-2)", margin: "12px 0 30px", fontSize: 16 }}>
        Seu tratamento, organizado junto com quem cuida de você.
      </p>
      <Link href="/login" style={{ background: "var(--accent)", color: "#fff", borderRadius: 15, padding: "15px 28px", fontWeight: 700, fontSize: 16, textDecoration: "none", width: "100%", maxWidth: 320 }}>
        Entrar
      </Link>
      <div style={{ display: "flex", gap: 16, marginTop: 18 }}>
        <Link href="/onboarding" style={{ color: "var(--accent)", fontWeight: 600, textDecoration: "none", fontSize: 14 }}>Sou paciente</Link>
        <Link href="/primeiro-acesso" style={{ color: "var(--accent)", fontWeight: 600, textDecoration: "none", fontSize: 14 }}>Sou da equipe</Link>
      </div>
    </main>
  );
}
