import type { Metadata } from "next";
import { Card, PageHeader, Section, Segmentos } from "@/components/ui";
import { addDias } from "@/lib/nutrition/planner";
import { hojeSP, planoAtivo, refeicoesDoPlano } from "@/lib/server/planos";
import { requireUser } from "@/lib/supabase/server";
import { FormDia, FormRefeicao, RegistroItem } from "./forms";

export const metadata: Metadata = { title: "Registrar" };

export default async function Registrar({ searchParams }: PageProps<"/registrar">) {
  const aba = (await searchParams).aba === "dia" ? "dia" : "refeicao";
  const { supabase, user } = await requireUser();
  const hoje = hojeSP();
  const [plano, { data: logs }, { data: track }] = await Promise.all([
    planoAtivo(supabase, user.id),
    supabase.from("food_logs").select("*").eq("user_id", user.id).gte("data", addDias(hoje, -6)).order("data", { ascending: false }).order("hora", { ascending: false }).limit(40),
    supabase.from("tracking").select("*").eq("user_id", user.id).eq("data", hoje).maybeSingle(),
  ]);
  const planejadas = plano ? await refeicoesDoPlano(supabase, plano.id, hoje, hoje) : [];
  const feitas = new Set((logs ?? []).filter((l) => l.data === hoje).map((l) => l.meal_id));

  const agrupados = new Map<string, NonNullable<typeof logs>>();
  for (const l of logs ?? []) agrupados.set(l.data, [...(agrupados.get(l.data) ?? []), l]);
  const rotuloDia = (d: string) => (d === hoje ? "Hoje" : d === addDias(hoje, -1) ? "Ontem" : d.split("-").reverse().slice(0, 2).join("/"));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader titulo="Registrar" subtitulo="Poucos toques. Desvios não são fracasso — são informação para ajustar o plano." />
      <Segmentos
        ativo={aba}
        itens={[
          { id: "refeicao", rotulo: "Refeição", href: "/registrar" },
          { id: "dia", rotulo: "Como foi o dia", href: "/registrar?aba=dia" },
        ]}
      />
      {aba === "refeicao" ? (
        <>
          <FormRefeicao planejadas={planejadas.filter((r) => !feitas.has(r.id)).map((r) => ({ id: r.id, nome: r.nome }))} />
          <Section titulo="Registros recentes" descricao="Últimos 7 dias">
            {!logs?.length ? (
              <Card className="text-sm text-muted">Nenhuma refeição registrada nos últimos 7 dias.</Card>
            ) : (
              <div className="space-y-4">
                {[...agrupados.entries()].map(([d, itens]) => (
                  <div key={d}>
                    <p className="mb-1.5 px-1 text-xs font-bold uppercase tracking-[0.06em] text-muted">{rotuloDia(d)}</p>
                    <ul className="divide-y divide-line/70 rounded-3xl border border-line/80 bg-surface px-4 shadow-card">
                      {itens.map((l) => (
                        <RegistroItem
                          key={l.id}
                          id={l.id}
                          tabela="food_logs"
                          titulo={`${l.refeicao ?? "Refeição"}${l.hora ? ` · ${l.hora.slice(0, 5)}` : ""}`}
                          texto={l.descricao ?? ""}
                          selo={l.seguiu_plano === "sim" ? "Seguiu o plano" : l.seguiu_plano === "parcial" ? "Em parte" : l.seguiu_plano === "nao" ? "Outra coisa" : undefined}
                        />
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </>
      ) : (
        <FormDia inicial={track ?? {}} />
      )}
    </div>
  );
}
