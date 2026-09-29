import type { Metadata } from "next";
import { Card, Empty, LinkButton, PageHeader } from "@/components/ui";
import { agrupar, type ItemCompra } from "@/lib/nutrition/shopping";
import { brl } from "@/lib/nutrition/foodmath";
import { addDias } from "@/lib/nutrition/planner";
import { hojeSP, planoAtivo } from "@/lib/server/planos";
import { requireUser } from "@/lib/supabase/server";
import { GerarLista, ItemLista, LimparComprados } from "./cliente";

export const metadata: Metadata = { title: "Lista de compras" };

export default async function Compras() {
  const { supabase, user } = await requireUser();
  const [plano, { data: listas }] = await Promise.all([
    planoAtivo(supabase, user.id),
    supabase.from("shopping_lists").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(6),
  ]);
  const lista = listas?.[0];
  const itens = (lista?.itens ?? []) as ItemCompra[];
  const comprados = itens.filter((i) => i.comprado).length;

  // semanas disponíveis no plano ativo
  const semanas: { de: string; ate: string }[] = [];
  if (plano) {
    let d = plano.data_inicio > hojeSP() ? plano.data_inicio : hojeSP();
    while (d <= plano.data_fim && semanas.length < 5) {
      const ate = addDias(d, 6) < plano.data_fim ? addDias(d, 6) : plano.data_fim;
      semanas.push({ de: d, ate });
      d = addDias(ate, 1);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        titulo="Lista de compras"
        subtitulo={lista ? `${lista.periodo} · ${itens.length} itens · ${comprados} comprados` : undefined}
        acao={lista && <p className="tabular rounded-2xl bg-accent-soft px-3 py-2 text-sm font-bold text-accent">≈ {brl(Number(lista.custo_estimado ?? 0))}</p>}
      />
      {plano && semanas.length > 0 && <GerarLista semanas={semanas} />}
      {!lista || !itens.length ? (
        <Empty titulo="Sua lista está vazia" texto="Gere a lista a partir do plano ou adicione ingredientes de uma receita." acao={<LinkButton href="/receitas" variante="secundario">Ver receitas</LinkButton>} />
      ) : (
        <div className="mt-4 space-y-4">
          {agrupar(itens).map((g) => (
            <Card key={g.categoria} className="p-0">
              <h2 className="border-b border-line px-5 py-3 text-sm font-bold">{g.categoria}</h2>
              <ul className="divide-y divide-line">
                {g.itens.map((i) => (
                  <ItemLista key={i.food_id} listaId={lista.id} item={i} />
                ))}
              </ul>
            </Card>
          ))}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <LimparComprados listaId={lista.id} />
            <p className="text-xs text-muted">Quantidades na forma de compra (ex.: arroz cru). Custos são estimativas.</p>
          </div>
        </div>
      )}
    </div>
  );
}
