import Link from "next/link";
import { redirect } from "next/navigation";
import { MessageCircle } from "lucide-react";
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
    <div className="mx-auto flex min-h-dvh max-w-7xl [--nav-h:76px] lg:[--nav-h:0px]">
      <aside className="no-print sticky top-0 hidden h-dvh w-64 shrink-0 flex-col overflow-y-auto border-r border-line/80 px-3 py-6 lg:flex">
        <Link href="/inicio" className="mb-7 flex items-center gap-2 px-3 text-lg font-extrabold tracking-tight text-brand">
          <Logo /> NUTRI.AI
        </Link>
        <Sidebar alertas={count ?? 0} />
        <p className="mt-auto px-3 pt-8 text-xs leading-relaxed text-muted">Não substitui médico ou nutricionista.</p>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="no-print sticky top-0 z-20 flex items-center justify-between border-b border-line/60 bg-bg/90 px-4 py-2.5 backdrop-blur lg:hidden">
          <Link href="/inicio" className="flex min-h-10 items-center gap-2 font-extrabold text-brand">
            <Logo size={24} /> NUTRI.AI
          </Link>
          <Link href="/assistente" className="flex min-h-10 items-center gap-1.5 rounded-full bg-brand-soft px-3.5 text-[13px] font-semibold text-brand-strong">
            <MessageCircle size={16} /> Assistente
          </Link>
        </header>
        <main className="px-4 pb-28 pt-5 sm:px-6 lg:px-10 lg:pb-14 lg:pt-10">{children}</main>
      </div>
      <BottomNav alertas={count ?? 0} />
    </div>
  );
}
