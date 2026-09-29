import type { Metadata } from "next";
import { AlertBox, Badge, Card, PageHeader } from "@/components/ui";
import type { Revisao } from "@/lib/nutrition/review";
import { hojeSP } from "@/lib/server/planos";
import { requireUser } from "@/lib/supabase/server";
import { NovaRevisao, Responder } from "./cliente";

export const metadata: Metadata = { title: "Revisão e ajustes" };

const Secao = ({ titulo, itens, vazio }: { titulo: string; itens: string[]; vazio: string }) => (
  <div>
    <h3 className="font-bold">{titulo}</h3>
    {itens.length ? <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-ink/85">{itens.map((i) => <li key={i}>{i}</li>)}</ul> : <p className="text-sm text-muted">{vazio}</p>}
  </div>
);

export default async function RevisaoPage() {
  const { supabase, user } = await requireUser();
  const { data: revs } = await supabase.from("plan_reviews").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10);
  const ultima = revs?.[0];
  const diasDesde = ultima ? Math.floor((new Date(hojeSP()).getTime() - new Date(ultima.periodo_fim).getTime()) / 864e5) : null;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader titulo="Revisão e ajustes" subtitulo="A cada 1–2 semanas olhamos juntos o que aconteceu e o que pode mudar. Nada muda sem sua confirmação." />
      {(diasDesde === null || diasDesde >= 7) && (
        <AlertBox gravidade="info" titulo={diasDesde === null ? "Faça sua primeira revisão" : `Sua última revisão foi há ${diasDesde} dias`}>
          Usamos seus registros dos últimos 14 dias. Com poucos dados, a recomendação é manter o plano.
        </AlertBox>
      )}
      <NovaRevisao />
      {(revs ?? []).map((rv) => {
        const r = rv.resumo as Revisao;
        return (
          <Card key={rv.id} className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-bold">
                Revisão de {rv.periodo_inicio.split("-").reverse().slice(0, 2).join("/")} a {rv.periodo_fim.split("-").reverse().slice(0, 2).join("/")}
              </h2>
              <Badge tom={rv.status === "pendente" ? "warn" : rv.status === "aceita" ? "brand" : "neutro"}>
                {rv.status === "pendente" ? "Aguardando você" : rv.status === "recusada" ? "Mantido" : r.ajustes.some((a) => a.deltaKcal || a.id === "simplificar") ? "Ajustes aplicados" : "Confirmado"}
              </Badge>
            </div>
            <Secao titulo="O que aconteceu?" itens={r.aconteceu} vazio="Sem registros no período." />
            <Secao titulo="O que funcionou?" itens={r.funcionou} vazio="Registre mais para identificarmos." />
            <Secao titulo="O que não funcionou?" itens={r.naoFuncionou} vazio="Nada preocupante nos registros." />
            <div>
              <h3 className="font-bold">O que podemos ajustar?</h3>
              <ul className="mt-2 space-y-2">
                {r.ajustes.map((a) => (
                  <li key={a.id} className="rounded-2xl bg-surface-2 px-3 py-2 text-sm">
                    <p className="font-semibold">{a.descricao}</p>
                    <p className="text-muted">Por quê: {a.motivo}</p>
                  </li>
                ))}
              </ul>
              {!r.dadosSuficientes && <p className="mt-2 text-xs text-muted">Com poucos dados, evitamos mudanças drásticas.</p>}
            </div>
            {rv.status === "pendente" && <Responder id={rv.id} temMudanca={r.ajustes.some((a) => a.tipo === "energia" || a.id === "simplificar")} />}
          </Card>
        );
      })}
    </div>
  );
}
