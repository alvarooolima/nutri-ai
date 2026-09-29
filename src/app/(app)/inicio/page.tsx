import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ChefHat, FileText, RefreshCcw, ShoppingBasket, Soup, Stethoscope } from "lucide-react";
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

const dataLonga = (d: string) =>
  new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(d + "T12:00:00Z"));

// Hick: poucos atalhos, só os que não estão na barra inferior
const ATALHOS = [
  { href: "/compras", nome: "Compras", icon: ShoppingBasket, cor: "bg-brand-soft text-brand" },
  { href: "/receitas", nome: "Receitas", icon: ChefHat, cor: "bg-brand-soft text-brand" },
  { href: "/sintomas", nome: "Sintoma", icon: Stethoscope, cor: "bg-brand-soft text-brand" },
  { href: "/revisao", nome: "Revisão", icon: RefreshCcw, cor: "bg-brand-soft text-brand" },
];

export default async function Inicio() {
  const { supabase, user } = await requireUser();
  const hoje = hojeSP();
  const [{ data: u }, plano, { data: track }, { data: alertas }, { data: logs }] = await Promise.all([
    supabase.from("users").select("nome,preferencias_app").eq("id", user.id).single(),
    planoAtivo(supabase, user.id),
    supabase.from("tracking").select("*").eq("user_id", user.id).eq("data", hoje).maybeSingle(),
    supabase.from("alerts").select("id,gravidade,mensagem,acao_recomendada").eq("user_id", user.id).eq("status", "ativo").eq("gravidade", "importante").limit(2),
    supabase.from("food_logs").select("meal_id").eq("user_id", user.id).eq("data", hoje),
  ]);
  const refs = plano ? await refeicoesDoPlano(supabase, plano.id, hoje, hoje) : [];
  const prefs = (u?.preferencias_app ?? {}) as { mostrarMacros?: boolean; unidades?: string };
  const esconder = Boolean((plano?.consideracoes as { esconderCalorias?: boolean } | null)?.esconderCalorias);
  const mostrarMacros = prefs.mostrarMacros !== false && !esconder;
  const logados = new Set((logs ?? []).map((l) => l.meal_id).filter(Boolean));
  const registradas = refs.filter((r) => logados.has(r.id)).length;
  const pendentes = refs.filter((r) => !logados.has(r.id));
  const proxima = pendentes[0];
  const kcalHoje = macrosItens(refs.flatMap((r) => r.itens)).kcal;
  const futuro = plano && !refs.length && plano.data_inicio > hoje;
  const nome = u?.nome?.split(" ")[0] || "você";

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.08em] text-brand">{dataLonga(hoje)}</p>
        <h1 className="mt-1 text-[26px] font-bold leading-tight tracking-tight sm:text-[30px]">
          {saudacao()}, {nome}. <span className="text-muted">Como você está hoje?</span>
        </h1>
      </header>

      {(alertas ?? []).map((a) => (
        <AlertBox key={a.id} gravidade="importante">
          {a.mensagem}{" "}
          <Link href="/alertas" className="font-semibold text-danger underline underline-offset-2">
            Ver o que fazer
          </Link>
        </AlertBox>
      ))}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:items-start xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="min-w-0 space-y-6">
      {/* Ponto focal: o que fazer agora */}
      <section className="space-y-3" aria-labelledby="hoje">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 id="hoje" className="text-lg font-bold tracking-tight">
              {proxima ? "Próxima refeição" : "Hoje"}
            </h2>
            {refs.length > 0 && (
              <p className="text-[13px] text-muted">
                {registradas} de {refs.length} refeições registradas{mostrarMacros && ` · ~${Math.round(kcalHoje).toLocaleString("pt-BR")} kcal planejadas`}
              </p>
            )}
          </div>
          {plano && (
            <Link href="/plano" className="inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-brand">
              Dia completo <ArrowRight size={16} />
            </Link>
          )}
        </div>
        {refs.length > 0 && (
          <div className="flex gap-1.5" aria-hidden>
            {refs.map((r) => (
              <span key={r.id} className={`h-1.5 flex-1 rounded-full ${logados.has(r.id) ? "bg-brand" : "bg-line"}`} />
            ))}
          </div>
        )}
        {!plano ? (
          <Card>
            <p className="font-semibold">Você ainda não tem um plano ativo.</p>
            <p className="mt-1 text-sm text-muted">Leva alguns segundos e usa o perfil que você já preencheu.</p>
            <LinkButton href="/plano" className="mt-4">Gerar meu plano</LinkButton>
          </Card>
        ) : futuro ? (
          <Card>
            <p className="font-semibold">Seu plano começa {dataLonga(plano.data_inicio)}.</p>
            <p className="mt-1 text-sm text-muted">Enquanto isso, confira o cardápio e faça as compras da primeira semana.</p>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:flex">
              <LinkButton href={`/plano?dia=${plano.data_inicio}`}>Ver o 1º dia</LinkButton>
              <LinkButton href="/compras" variante="secundario">Compras</LinkButton>
            </div>
          </Card>
        ) : !refs.length ? (
          <Card>
            <p className="font-semibold">Seu plano atual terminou.</p>
            <p className="mt-1 text-sm text-muted">Gere um novo período para continuar — seu histórico fica salvo.</p>
            <LinkButton href="/plano" className="mt-4">Gerar novo período</LinkButton>
          </Card>
        ) : !proxima ? (
          <Card className="border-brand/20 bg-brand-soft">
            <p className="font-semibold text-brand-strong">Todas as refeições de hoje foram registradas. 🌿</p>
            <p className="mt-1 text-sm text-brand-strong/80">Que tal registrar como foi o dia — sono, energia e peso?</p>
            <LinkButton href="/registrar" variante="secundario" className="mt-4">Registrar o dia</LinkButton>
          </Card>
        ) : (
          <RefeicaoCard r={proxima} mostrarMacros={mostrarMacros} unidades={prefs.unidades} compacto />
        )}
      </section>

      <section aria-label="Atalhos">
        <ul className="grid grid-cols-4 gap-2 sm:gap-3">
          {ATALHOS.map(({ href, nome: n, icon: Icon, cor }) => (
            <li key={href}>
              <Link href={href} className="flex h-full min-h-20 flex-col items-center justify-center gap-1.5 rounded-2xl border border-line bg-surface p-2 text-center transition hover:border-brand/40">
                <span className={`flex size-10 items-center justify-center rounded-2xl ${cor}`}>
                  <Icon size={20} />
                </span>
                <span className="text-[13px] font-semibold leading-tight">{n}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      </div>
      <div className="min-w-0 space-y-6">
      <CheckIn inicial={{ energia: track?.energia ?? null, fome: track?.fome ?? null, sono: track?.sono ?? null, agua: track?.agua_ml ?? 0 }} />
      <Link href="/relatorio" className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 transition hover:border-brand/40">
        <FileText size={20} className="shrink-0 text-brand" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold">Relatório para o nutricionista</span>
          <span className="block text-[13px] text-muted">Resumo de uma página para levar à consulta</span>
        </span>
        <ArrowRight size={18} className="shrink-0 text-muted" aria-hidden />
      </Link>
      <Link href="/desafio" className="group flex items-center gap-4 rounded-2xl border border-line bg-surface p-4 transition hover:border-brand/40">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-brand">
          <Soup size={22} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-bold uppercase tracking-[0.08em] text-brand">{hoje.slice(5, 7) === "10" ? "Outubro é mês do desafio" : "Projeto especial"}</span>
          <span className="mt-0.5 block text-[15px] font-semibold leading-snug">Desafio 31 dias — Alimentação Japonesa</span>
          <span className="block text-[13px] text-muted">Cardápio, compras e controle de sódio</span>
        </span>
        <ArrowRight size={18} className="shrink-0 text-muted transition group-hover:translate-x-0.5" aria-hidden />
      </Link>
      </div>
      </div>
    </div>
  );
}
