import type { Metadata } from "next";
import { Card, Empty, LinkButton, PageHeader } from "@/components/ui";
import { addDias } from "@/lib/nutrition/planner";
import { preparoSemanal } from "@/lib/nutrition/prep";
import { agruparPorDia, hojeSP, planoAtivo, refeicoesDoPlano } from "@/lib/server/planos";
import { requireUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Preparação semanal" };

export default async function Preparo() {
  const { supabase, user } = await requireUser();
  const plano = await planoAtivo(supabase, user.id);
  if (!plano) return <Empty titulo="Sem plano ativo" acao={<LinkButton href="/plano">Gerar plano</LinkButton>} />;
  const de = plano.data_inicio > hojeSP() ? plano.data_inicio : hojeSP();
  const refs = await refeicoesDoPlano(supabase, plano.id, de, addDias(de, 6));
  const dias = agruparPorDia(refs.filter((r) => !r.foraDeCasa));
  const { passos, reaproveitamento, marmitas } = preparoSemanal(dias);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader titulo="Preparação semanal" subtitulo={`Roteiro para os próximos ${dias.length} dias do plano${marmitas ? ` · ${marmitas} marmitas` : ""}. Reserve ~2 horas no fim de semana.`} />
      <div className="space-y-4">
        {passos.map((p) => (
          <Card key={p.titulo}>
            <h2 className="font-bold">{p.titulo}</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink/85">{p.detalhes.map((d) => <li key={d}>{d}</li>)}</ul>
          </Card>
        ))}
        <Card className="bg-brand-soft">
          <h2 className="font-bold text-brand-strong">Reaproveitamento e menos desperdício</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{reaproveitamento.map((d) => <li key={d}>{d}</li>)}</ul>
        </Card>
        <Card>
          <h2 className="font-bold">Segurança dos alimentos</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">
            <li>Resfrie preparações em até 2 horas após o cozimento e guarde em potes fechados.</li>
            <li>Na geladeira, consuma preparações prontas em até 3 dias; no congelador, em até 3 meses.</li>
            <li>Reaqueça até ferver ou ficar bem quente por inteiro.</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
