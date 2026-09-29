import type { Metadata } from "next";
import Link from "next/link";
import { RECIPES } from "@/data/recipes";
import { PageHeader, cx } from "@/components/ui";
import { brl, macrosItens } from "@/lib/nutrition/foodmath";
import { MODOS } from "@/lib/nutrition/planner";

export const metadata: Metadata = { title: "Receitas" };

const TIPOS = [
  { id: "cafe", nome: "Café da manhã" },
  { id: "almoco", nome: "Almoço/jantar" },
  { id: "lanche", nome: "Lanches" },
  { id: "ceia", nome: "Ceia" },
];

export default async function Receitas({ searchParams }: PageProps<"/receitas">) {
  const sp = await searchParams;
  const modo = typeof sp.modo === "string" ? sp.modo : "";
  const tipo = typeof sp.tipo === "string" ? sp.tipo : "";
  const rapido = sp.rapido === "1";
  const lista = RECIPES.filter((r) => (!modo || r.modos.includes(modo as never)) && (!tipo || r.tipos.includes(tipo as never)) && (!rapido || r.tempo <= 15));
  const url = (k: string, v: string) => {
    const p = new URLSearchParams({ ...(modo && { modo }), ...(tipo && { tipo }), ...(rapido && { rapido: "1" }) });
    if (v) p.set(k, v);
    else p.delete(k);
    return `/receitas?${p}`;
  };
  const chip = (ativo: boolean) => cx("inline-flex min-h-10 shrink-0 items-center rounded-full border px-4 text-sm font-medium transition", ativo ? "border-brand bg-brand text-white shadow-card" : "border-line bg-surface hover:border-brand/50");

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader titulo="Receitas" subtitulo={`${lista.length} ${lista.length === 1 ? "receita" : "receitas"} · nutrientes e custo por porção de referência`} />
      <p className="mb-2 text-xs font-bold uppercase tracking-[0.06em] text-muted">Estilo</p>
      <div className="scroll-x -mx-4 mb-4 flex gap-2 px-4 pb-1">
        <Link href={url("modo", "")} className={chip(!modo)}>Todas</Link>
        {MODOS.filter((m) => m.id !== "alta_proteina" && m.id !== "baixo_custo").map((m) => (
          <Link key={m.id} href={url("modo", m.id)} className={chip(modo === m.id)}>{m.nome}</Link>
        ))}
      </div>
      <p className="mb-2 text-xs font-bold uppercase tracking-[0.06em] text-muted">Refeição e tempo</p>
      <div className="scroll-x -mx-4 mb-6 flex gap-2 px-4 pb-1">
        {TIPOS.map((t) => (
          <Link key={t.id} href={url("tipo", tipo === t.id ? "" : t.id)} className={chip(tipo === t.id)}>{t.nome}</Link>
        ))}
        <Link href={url("rapido", rapido ? "" : "1")} className={chip(rapido)}>Até 15 min</Link>
      </div>
      {lista.length === 0 && <p className="rounded-3xl bg-surface-2 p-6 text-center text-sm text-muted">Nenhuma receita com esses filtros. <Link href="/receitas" className="font-semibold text-brand">Limpar filtros</Link></p>}
      <ul className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
        {lista.map((r) => {
          const m = macrosItens(r.itens);
          return (
            <li key={r.id}>
              <Link href={`/receitas/${r.id}`} className="group flex h-full overflow-hidden rounded-3xl border border-line/80 bg-surface shadow-card transition hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-raised sm:flex-col">
                <div className="flex w-24 shrink-0 items-center justify-center bg-gradient-to-br from-brand-soft to-accent-soft text-4xl sm:aspect-[16/7] sm:w-auto sm:text-5xl" aria-hidden>{r.ilustracao}</div>
                <div className="flex min-w-0 flex-1 flex-col p-4">
                  <h2 className="text-[15px] font-bold leading-snug">{r.nome}</h2>
                  <p className="mt-1 text-xs text-muted">{r.tempo} min · {r.dificuldade}{r.tags.includes("marmita") && " · marmita"}</p>
                  <p className="tabular mt-auto flex flex-wrap gap-x-2 pt-2.5 text-xs text-muted sm:border-t sm:border-line/60">
                    <strong className="font-semibold text-ink">{Math.round(m.kcal)} kcal</strong>
                    <span>P {Math.round(m.p)} g</span>
                    <span className="ml-auto font-semibold text-accent">{brl(m.custo)}</span>
                  </p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
