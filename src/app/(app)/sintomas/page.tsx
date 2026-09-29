import type { Metadata } from "next";
import { AlertBox, Card, PageHeader } from "@/components/ui";
import { addDias } from "@/lib/nutrition/planner";
import { associacoes, AVISO_ASSOCIACAO } from "@/lib/nutrition/review";
import { SINTOMAS_ALERTA } from "@/lib/nutrition/safety";
import { hojeSP } from "@/lib/server/planos";
import { requireUser } from "@/lib/supabase/server";
import { RegistroItem } from "../registrar/forms";
import { FormSintoma } from "./form";

export const metadata: Metadata = { title: "Diário de sintomas" };

export default async function Sintomas() {
  const { supabase, user } = await requireUser();
  const desde = addDias(hojeSP(), -60);
  const [{ data: sint }, { data: refs }] = await Promise.all([
    supabase.from("symptoms").select("id,data,hora,sintoma,intensidade,duracao,relacao_com_alimento").eq("user_id", user.id).gte("data", desde).order("data", { ascending: false }).order("hora", { ascending: false }),
    supabase.from("food_logs").select("data,hora,descricao").eq("user_id", user.id).gte("data", desde),
  ]);
  const assoc = associacoes(refs ?? [], sint ?? []);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader titulo="Diário de sintomas" subtitulo="Registre como se sente. Com o tempo, mostramos possíveis padrões — sem tirar conclusões apressadas." />
      <FormSintoma />
      <Card>
        <h2 className="font-bold">Padrões nos seus registros</h2>
        {assoc.length === 0 ? (
          <p className="mt-1 text-sm text-muted">Ainda não há dados suficientes. Precisamos de pelo menos 3 ocorrências de um mesmo sintoma e registros de refeições para procurar padrões.</p>
        ) : (
          <div className="mt-2 space-y-2">
            <AlertBox gravidade="info" titulo="Associação não é causa">{AVISO_ASSOCIACAO} Fatores como estresse, sono, quantidade e combinações também influenciam. Converse com um profissional antes de excluir alimentos.</AlertBox>
            <ul className="space-y-2 text-sm">
              {assoc.map((a) => (
                <li key={a.sintoma + a.alimento} className="rounded-2xl bg-surface-2 px-3 py-2">
                  <strong>{SINTOMAS_ALERTA.find((x) => x.id === a.sintoma)?.nome ?? a.sintoma}</strong>: “{a.alimento}” apareceu nas 24 h anteriores em {a.ocorrencias} de {a.totalSintoma} registros ({Math.round(a.taxaComAlimento * 100)}%), contra {Math.round(a.taxaBase * 100)}% das refeições em geral. {AVISO_ASSOCIACAO}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>
      <Card>
        <h2 className="mb-2 font-bold">Histórico (60 dias)</h2>
        {!sint?.length ? (
          <p className="text-sm text-muted">Nenhum sintoma registrado.</p>
        ) : (
          <ul className="divide-y divide-line">
            {sint.map((s) => (
              <RegistroItem key={s.id} id={s.id} tabela="symptoms" titulo={`${SINTOMAS_ALERTA.find((a) => a.id === s.sintoma)?.nome ?? s.sintoma} · intensidade ${s.intensidade}/10`} texto={`${s.data.split("-").reverse().join("/")} ${s.hora?.slice(0, 5) ?? ""}${s.duracao ? ` · ${s.duracao}` : ""}${s.relacao_com_alimento ? ` · percebido após: ${s.relacao_com_alimento}` : ""}`} />
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
