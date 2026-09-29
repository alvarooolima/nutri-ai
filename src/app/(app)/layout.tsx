import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { requireUser } from "@/lib/supabase/server";
import { BottomNav, Sidebar } from "./nav";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const { supabase, user } = await requireUser();
  const [{ data: u }, { count }] = await Promise.all([
    supabase.from("users").select("nome,onboarding_completo").eq("id", user.id).single(),
    supabase.from("alerts").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "ativo").in("gravidade", ["atencao", "importante"]),
  ]);
  if (!u?.onboarding_completo) redirect("/onboarding");

  return (
    <div className="mx-auto flex min-h-dvh max-w-7xl">
      <aside className="no-print sticky top-0 hidden h-dvh w-64 shrink-0 flex-col overflow-y-auto border-r border-line px-3 py-5 lg:flex">
        <Link href="/inicio" className="mb-5 flex items-center gap-2 px-3 text-lg font-extrabold tracking-tight text-brand">
          <Logo /> NUTRI.AI
        </Link>
        <Sidebar alertas={count ?? 0} />
        <p className="mt-auto px-3 pt-6 text-xs text-muted">Não substitui médico ou nutricionista.</p>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="no-print flex items-center justify-between px-4 pt-4 lg:hidden">
          <Link href="/inicio" className="flex items-center gap-2 font-extrabold text-brand">
            <Logo size={24} /> NUTRI.AI
          </Link>
          <Link href="/assistente" className="rounded-full bg-brand-soft px-3 py-1.5 text-xs font-semibold text-brand-strong">
            Assistente
          </Link>
        </header>
        <main className="px-4 pb-28 pt-4 sm:px-6 lg:px-10 lg:pb-12 lg:pt-8">{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}
