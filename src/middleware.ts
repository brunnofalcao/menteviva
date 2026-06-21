// Middleware: mantém sessão Supabase viva e protege rotas por role.
// /app/*    -> paciente
// /medico/* -> médico
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "placeholder-anon-key",
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (toSet) =>
          toSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options)),
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();
  const path = req.nextUrl.pathname;
  const isProtected = path.startsWith("/app") || path.startsWith("/medico");

  if (isProtected && !user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (user) {
    const { data: profile } = await supabase
      .from("profiles").select("role").eq("id", user.id).single();

    // membro de equipe também acessa /medico
    let isTeam = false;
    if (path.startsWith("/medico") && profile?.role !== "doctor") {
      const { data: tm } = await supabase
        .from("team_members").select("id").eq("member_id", user.id).not("accepted_at", "is", null).limit(1);
      isTeam = !!tm?.length;
    }

    // paciente (e não-equipe) tentando o painel -> manda pro app
    if (path.startsWith("/medico") && profile?.role !== "doctor" && !isTeam) {
      return NextResponse.redirect(new URL("/app", req.url));
    }
    // médico tentando o app do paciente -> manda pro painel
    if (path.startsWith("/app") && profile?.role !== "patient") {
      return NextResponse.redirect(new URL("/medico", req.url));
    }
  }
  return res;
}

export const config = {
  matcher: ["/app/:path*", "/medico/:path*"],
};
