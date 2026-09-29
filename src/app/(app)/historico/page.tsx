import type { Metadata } from "next";
import { Badge, Card, Empty, LinkButton, PageHeader } from "@/components/ui";
import { brl } from "@/lib/nutrition/foodmath";
import { MODOS } from "@/lib/nutrition/planner";
import { requireUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Histórico de planos" };

const d = (x: string) => x.split("-").reverse().join("/");

export default async function Historico() {
  const { supabase, user } = await requireUser();
  const [{ data: planos }, { data: log }] = await Promise.all([
    supabase.from("meal_plans").select("id,versao,tipo,modo,status,data_inicio,data_fim,calorias_estimadas,proteina_estimada,custo_estimado,created_at,desafio").eq("user_id", user.id).order("versao", { ascending: false }),
    supabase.from("audit_log").select("acao,detalhes,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(30),
  ]);
  const ACOES: Record<string, string> = {
    plano_criado: "Plano criado", troca_alimento: "Alimento trocado", troca_refeicao: "Refeição trocada", ajuste_fome: "Ajuste de fome", comer_fora: "Refeição fora de casa",
    reduzir_custo: "Custo reduzido", revisao_aceita: "Revisão aplicada", perfil_confirmado: "Perfil confirmado", perfil_saude_atualizado: "Perfil Saúde atualizado", exportacao_dados: "Dados exportados", consentimento_saude_revogado: "Consentimento de saúde revogado",
  };
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader titulo="Histórico de planos" subtitulo="Todas as versões ficam guardadas para rastreabilidade." />
      {!planos?.length ? (
        <Empty titulo="Nenhum plano ainda" acao={<LinkButton href="/plano">Gerar plano</LinkButton>} />
      ) : (
        <ul className="space-y-3">
          {planos.map((p) => (
            <li key={p.id}>
              <Card className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-bold">Versão {p.versao} · {MODOS.find((m) => m.id === p.modo)?.nome} · {p.tipo}{p.desafio && " · Desafio japonês"}</p>
                  <p className="text-sm text-muted">{d(p.data_inicio)} a {d(p.data_fim)} · ~{p.calorias_estimadas} kcal/dia · P {p.proteina_estimada} g · {brl(Number(p.custo_estimado ?? 0))} no período</p>
                </div>
                <Badge tom={p.status === "ativo" ? "brand" : "neutro"}>{p.status === "ativo" ? "Ativo" : "Anterior"}</Badge>
              </Card>
            </li>
          ))}
        </ul>
      )}
      <Card>
        <h2 className="mb-2 font-bold">Registro de alterações</h2>
        <ul className="divide-y divide-line text-sm">
          {(log ?? []).map((l, i) => (
            <li key={i} className="flex justify-between gap-3 py-2">
              <span>{ACOES[l.acao] ?? l.acao}</span>
              <span className="text-muted">{new Date(l.created_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" })}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
