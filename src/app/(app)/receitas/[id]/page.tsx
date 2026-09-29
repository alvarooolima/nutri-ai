import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FOOD_MAP } from "@/data/foods";
import { RECIPE_MAP } from "@/data/recipes";
import { Badge, Card, PageHeader, Stat } from "@/components/ui";
import { brl, formatMedida, macrosItens } from "@/lib/nutrition/foodmath";
import { MODOS } from "@/lib/nutrition/planner";
import { AddLista } from "./add-lista";

export async function generateMetadata({ params }: PageProps<"/receitas/[id]">): Promise<Metadata> {
  const { id } = await params;
  return { title: RECIPE_MAP[id]?.nome ?? "Receita" };
}

export default async function Receita({ params }: PageProps<"/receitas/[id]">) {
  const { id } = await params;
  const r = RECIPE_MAP[id];
  if (!r) notFound();
  const m = macrosItens(r.itens);
  const fontes = [...new Set(r.itens.map((i) => FOOD_MAP[i.food].fonte))];

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader titulo={r.nome} subtitulo={r.descricao} voltar="/receitas" />
      <div className="mb-5 flex h-40 items-center justify-center rounded-3xl bg-gradient-to-br from-brand-soft to-accent-soft text-7xl" role="img" aria-label={`Ilustração: ${r.nome}`}>
        {r.ilustracao}
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        <Badge>{r.tempo} min</Badge>
        <Badge>Dificuldade {r.dificuldade}</Badge>
        <Badge>Rende 1 porção</Badge>
        {r.modos.map((x) => (
          <Badge key={x} tom="brand">{MODOS.find((mm) => mm.id === x)?.nome}</Badge>
        ))}
        {r.tags.includes("marmita") && <Badge tom="accent">Boa para marmita</Badge>}
      </div>
      <div className="mb-5 grid grid-cols-3 gap-2 sm:grid-cols-6">
        <Stat rotulo="Energia" valor={`${Math.round(m.kcal)}`} sub="kcal" />
        <Stat rotulo="Proteína" valor={`${Math.round(m.p)} g`} />
        <Stat rotulo="Carboidratos" valor={`${Math.round(m.c)} g`} />
        <Stat rotulo="Gorduras" valor={`${Math.round(m.g)} g`} />
        <Stat rotulo="Fibras" valor={`${Math.round(m.f)} g`} />
        <Stat rotulo="Custo" valor={brl(m.custo)} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="mb-2 font-bold">Ingredientes (porção de referência)</h2>
          <ul className="divide-y divide-line text-sm">
            {r.itens.map((i) => (
              <li key={i.food} className="flex justify-between gap-3 py-2">
                <span>
                  {FOOD_MAP[i.food].nome}
                  {i.preparo && <span className="text-muted"> — {i.preparo}</span>}
                </span>
                <span className="shrink-0 text-right text-muted">
                  {formatMedida(i.food, i.g)}
                  <br />
                  <span className="text-xs">{Math.round(i.g)} g</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted">No seu plano, as porções são ajustadas às suas metas.</p>
          <div className="mt-4">
            <AddLista receitaId={r.id} />
          </div>
        </Card>
        <Card>
          <h2 className="mb-2 font-bold">Modo de preparo</h2>
          <ol className="list-decimal space-y-2 pl-5 text-sm">
            {r.preparo.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ol>
        </Card>
      </div>
      <p className="mt-4 text-xs text-muted">
        Valores nutricionais: {fontes.join("; ")}. Sódio estimado: {Math.round(m.na)} mg (sem sal adicionado). Custo: estimativa aproximada de varejo.
      </p>
    </div>
  );
}
