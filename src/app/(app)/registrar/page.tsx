import type { Metadata } from "next";
import { Card, PageHeader } from "@/components/ui";
import { addDias } from "@/lib/nutrition/planner";
import { hojeSP, planoAtivo, refeicoesDoPlano } from "@/lib/server/planos";
import { requireUser } from "@/lib/supabase/server";
import { FormDia, FormRefeicao, RegistroItem } from "./forms";

export const metadata: Metadata = { title: "Registrar" };

export default async function Registrar() {
  const { supabase, user } = await requireUser();
  const hoje = hojeSP();
  const [plano, { data: logs }, { data: track }] = await Promise.all([
    planoAtivo(supabase, user.id),
    supabase.from("food_logs").select("*").eq("user_id", user.id).gte("data", addDias(hoje, -6)).order("data", { ascending: false }).order("hora", { ascending: false }).limit(40),
    supabase.from("tracking").select("*").eq("user_id", user.id).eq("data", hoje).maybeSingle(),
  ]);
  const planejadas = plano ? await refeicoesDoPlano(supabase, plano.id, hoje, hoje) : [];
  const feitas = new Set((logs ?? []).filter((l) => l.data === hoje).map((l) => l.meal_id));

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader titulo="Registrar" subtitulo="Poucos toques: o que você comeu e como está. Desvios não são fracasso — são informação." />
      <FormRefeicao planejadas={planejadas.filter((r) => !feitas.has(r.id)).map((r) => ({ id: r.id, nome: r.nome }))} />
      <FormDia inicial={track ?? {}} />
      <Card>
        <h2 className="mb-2 font-bold">Registros recentes</h2>
        {!logs?.length ? (
          <p className="text-sm text-muted">Nenhuma refeição registrada nos últimos 7 dias.</p>
        ) : (
          <ul className="divide-y divide-line">
            {logs.map((l) => (
              <RegistroItem key={l.id} id={l.id} tabela="food_logs" titulo={`${l.refeicao ?? "Refeição"} · ${l.data.split("-").reverse().slice(0, 2).join("/")} ${l.hora?.slice(0, 5) ?? ""}`} texto={`${l.descricao ?? ""}${l.seguiu_plano ? ` — ${l.seguiu_plano === "sim" ? "seguiu o plano" : l.seguiu_plano === "parcial" ? "seguiu em parte" : "comeu outra coisa"}` : ""}`} />
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
