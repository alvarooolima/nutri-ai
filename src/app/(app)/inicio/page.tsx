import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, CalendarDays, ChefHat, ClipboardList, LineChart, RefreshCcw, ShoppingBasket, Soup } from "lucide-react";
import { AlertBox, Card, LinkButton } from "@/components/ui";
import { RefeicaoCard } from "@/components/plano/refeicao-card";
import { macrosItens } from "@/lib/nutrition/foodmath";
import { hojeSP, planoAtivo, refeicoesDoPlano } from "@/lib/server/planos";
import { requireUser } from "@/lib/supabase/server";
import { CheckIn } from "./checkin";

export const metadata: Metadata = { title: "Início" };

function saudacao() {
  const h = Number(new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", hour12: false }).format(new Date()));
  return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
}

const CARDS = [
  { href: "/plano", nome: "Meu Plano", icon: CalendarDays, cor: "bg-brand-soft text-brand-strong" },
  { href: "/compras", nome: "Compras", icon: ShoppingBasket, cor: "bg-accent-soft text-accent" },
  { href: "/evolucao", nome: "Evolução", icon: LineChart, cor: "bg-info-soft text-info" },
  { href: "/registrar", nome: "Registros", icon: ClipboardList, cor: "bg-warn-soft text-warn" },
  { href: "/receitas", nome: "Receitas", icon: ChefHat, cor: "bg-brand-soft text-brand-strong" },
  { href: "/evidencias", nome: "Evidências", icon: BookOpen, cor: "bg-info-soft text-info" },
  { href: "/revisao", nome: "Ajustar", icon: RefreshCcw, cor: "bg-accent-soft text-accent" },
];

export default async function Inicio() {
  const { supabase, user } = await requireUser();
  const hoje = hojeSP();
  const [{ data: u }, plano, { data: track }, { data: alertas }, { data: logs }] = await Promise.all([
    supabase.from("users").select("nome,preferencias_app").eq("id", user.id).single(),
    planoAtivo(supabase, user.id),
    supabase.from("tracking").select("*").eq("user_id", user.id).eq("data", hoje).maybeSingle(),
    supabase.from("alerts").select("id,gravidade,mensagem,acao_recomendada").eq("user_id", user.id).eq("status", "ativo").eq("gravidade", "importante").limit(2),
    supabase.from("food_logs").select("meal_id,seguiu_plano").eq("user_id", user.id).eq("data", hoje),
  ]);
  const refs = plano ? await refeicoesDoPlano(supabase, plano.id, hoje, hoje) : [];
  const prefs = (u?.preferencias_app ?? {}) as { mostrarMacros?: boolean; unidades?: string };
  const esconder = Boolean((plano?.consideracoes as { esconderCalorias?: boolean } | null)?.esconderCalorias);
  const mostrarMacros = prefs.mostrarMacros !== false && !esconder;
  const registradas = new Set((logs ?? []).map((l) => l.meal_id).filter(Boolean));
  const pendentes = refs.filter((r) => !registradas.has(r.id));
  const kcalHoje = macrosItens(refs.flatMap((r) => r.itens)).kcal;
  const outubro = hoje.slice(5, 7) === "10";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <section>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {saudacao()}, {u?.nome?.split(" ")[0] || "você"}. Como você está hoje?
        </h1>
        <CheckIn inicial={{ energia: track?.energia ?? null, fome: track?.fome ?? null, sono: track?.sono ?? null, agua: track?.agua_ml ?? 0 }} />
      </section>

      {(alertas ?? []).map((a) => (
        <AlertBox key={a.id} gravidade="importante">
          {a.mensagem} <Link href="/alertas" className="font-semibold underline">Ver detalhes</Link>
        </AlertBox>
      ))}

      <section>
        <div className="mb-3 flex items-end justify-between">
          <div>
            <h2 className="text-lg font-bold">Hoje</h2>
            {plano && mostrarMacros && <p className="text-sm text-muted">~{Math.round(kcalHoje).toLocaleString("pt-BR")} kcal planejadas · {registradas.size}/{refs.length} refeições registradas</p>}
          </div>
          {plano && <Link href="/plano" className="text-sm font-semibold text-brand">Ver plano</Link>}
        </div>
        {!plano ? (
          <Card>
            <p className="font-semibold">Você ainda não tem um plano ativo.</p>
            <LinkButton href="/plano" className="mt-3">Gerar plano</LinkButton>
          </Card>
        ) : refs.length === 0 ? (
          <Card>
            <p className="font-semibold">Seu plano atual não cobre hoje.</p>
            <p className="text-sm text-muted">Gere um novo período para continuar.</p>
            <LinkButton href="/plano" className="mt-3">Gerar novo período</LinkButton>
          </Card>
        ) : pendentes.length === 0 ? (
          <Card className="bg-brand-soft">
            <p className="font-semibold text-brand-strong">Todas as refeições de hoje foram registradas. 🌿</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {pendentes.slice(0, 2).map((r) => (
              <RefeicaoCard key={r.id} r={r} mostrarMacros={mostrarMacros} unidades={prefs.unidades} compacto />
            ))}
          </div>
        )}
      </section>

      <section aria-label="Atalhos">
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {CARDS.map(({ href, nome, icon: Icon, cor }) => (
            <li key={href}>
              <Link href={href} className="flex h-full flex-col items-start gap-2 rounded-3xl border border-line bg-surface p-4 hover:border-brand/40">
                <span className={`flex size-10 items-center justify-center rounded-2xl ${cor}`}>
                  <Icon size={20} />
                </span>
                <span className="text-sm font-semibold">{nome}</span>
              </Link>
            </li>
          ))}
          <li>
            <Link href="/sintomas" className="flex h-full flex-col items-start gap-2 rounded-3xl border border-line bg-surface p-4 hover:border-brand/40">
              <span className="flex size-10 items-center justify-center rounded-2xl bg-danger-soft text-danger">+</span>
              <span className="text-sm font-semibold">Sintoma</span>
            </Link>
          </li>
        </ul>
      </section>

      <Link href="/desafio" className="block rounded-3xl bg-accent-soft p-5 hover:opacity-95">
        <p className="flex items-center gap-2 text-sm font-semibold text-accent">
          <Soup size={16} /> {outubro ? "Outubro é mês do desafio" : "Projeto especial"}
        </p>
        <p className="mt-1 text-lg font-bold">Desafio 31 dias — Alimentação Japonesa</p>
        <p className="text-sm text-ink/75">Cardápio de 31 dias, compras semanais, preparo antecipado e controle de sódio.</p>
      </Link>
    </div>
  );
}
