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
  const chip = (ativo: boolean) => cx("shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium", ativo ? "border-brand bg-brand text-white" : "border-line bg-surface");

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader titulo="Receitas" subtitulo={`${lista.length} receitas com informação nutricional e custo estimado por porção.`} />
      <div className="-mx-4 mb-2 flex gap-2 overflow-x-auto px-4 pb-1">
        <Link href={url("modo", "")} className={chip(!modo)}>Todas</Link>
        {MODOS.filter((m) => m.id !== "alta_proteina" && m.id !== "baixo_custo").map((m) => (
          <Link key={m.id} href={url("modo", m.id)} className={chip(modo === m.id)}>{m.nome}</Link>
        ))}
      </div>
      <div className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1">
        {TIPOS.map((t) => (
          <Link key={t.id} href={url("tipo", tipo === t.id ? "" : t.id)} className={chip(tipo === t.id)}>{t.nome}</Link>
        ))}
        <Link href={url("rapido", rapido ? "" : "1")} className={chip(rapido)}>Até 15 min</Link>
      </div>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {lista.map((r) => {
          const m = macrosItens(r.itens);
          return (
            <li key={r.id}>
              <Link href={`/receitas/${r.id}`} className="block h-full overflow-hidden rounded-3xl border border-line bg-surface hover:border-brand/40">
                <div className="flex h-28 items-center justify-center bg-gradient-to-br from-brand-soft to-accent-soft text-5xl" aria-hidden>{r.ilustracao}</div>
                <div className="p-4">
                  <h2 className="font-bold leading-snug">{r.nome}</h2>
                  <p className="mt-1 text-xs text-muted">
                    {r.tempo} min · {r.dificuldade} · {Math.round(m.kcal)} kcal · P {Math.round(m.p)} g · {brl(m.custo)}
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
