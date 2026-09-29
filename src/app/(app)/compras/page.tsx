import type { Metadata } from "next";
import { ShoppingBasket } from "lucide-react";
import { Card, Empty, LinkButton, PageHeader, Progress } from "@/components/ui";
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

  const restante = itens.filter((i) => !i.comprado).reduce((a, i) => a + i.custo, 0);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader titulo="Lista de compras" subtitulo={lista ? lista.periodo : "Gerada a partir do seu plano, agrupada por setor do mercado."} />
      <div className="space-y-6">
        {plano && semanas.length > 0 && <GerarLista semanas={semanas} />}
        {!lista || !itens.length ? (
          <Empty icon={ShoppingBasket} titulo="Sua lista está vazia" texto="Gere a lista a partir do plano ou adicione ingredientes de uma receita." acao={<LinkButton href="/receitas" variante="secundario">Ver receitas</LinkButton>} />
        ) : (
          <>
            <Card className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <div className="min-w-48 flex-1">
                <div className="mb-1.5 flex justify-between text-sm">
                  <span className="font-semibold">
                    {comprados} de {itens.length} itens
                  </span>
                  <span className="tabular text-muted">{Math.round((comprados / itens.length) * 100)}%</span>
                </div>
                <Progress valor={comprados} max={itens.length} rotulo="Itens comprados" />
              </div>
              <div className="flex gap-6">
                <div>
                  <p className="text-xs text-muted">Total estimado</p>
                  <p className="tabular text-lg font-bold">{brl(Number(lista.custo_estimado ?? 0))}</p>
                </div>
                <div>
                  <p className="text-xs text-muted">Falta comprar</p>
                  <p className="tabular text-lg font-bold text-accent">{brl(restante)}</p>
                </div>
              </div>
            </Card>
            <div className="columns-1 gap-4 lg:columns-2 [&>*]:mb-4">
              {agrupar(itens).map((g) => {
                const ordenados = [...g.itens].sort((a, b) => Number(a.comprado) - Number(b.comprado));
                const feitos = g.itens.filter((i) => i.comprado).length;
                return (
                  <section key={g.categoria} className="break-inside-avoid overflow-hidden rounded-2xl border border-line/80 bg-surface shadow-card">
                    <h2 className="flex items-center justify-between border-b border-line/70 px-5 py-3 text-sm font-bold">
                      {g.categoria}
                      <span className="tabular text-xs font-medium text-muted">
                        {feitos}/{g.itens.length}
                      </span>
                    </h2>
                    <ul className="divide-y divide-line/60">
                      {ordenados.map((i) => (
                        <ItemLista key={i.food_id} listaId={lista.id} item={i} />
                      ))}
                    </ul>
                  </section>
                );
              })}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <LimparComprados listaId={lista.id} />
              <p className="text-xs text-muted">Quantidades na forma de compra (ex.: arroz cru). Custos são estimativas.</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
