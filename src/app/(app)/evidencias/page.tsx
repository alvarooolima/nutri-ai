import type { Metadata } from "next";
import { FONTE_MAP, FONTES } from "@/data/sources";
import { BookOpen, ChevronDown } from "lucide-react";
import { Badge, Card, Empty, LinkButton, PageHeader } from "@/components/ui";
import { ROTULO_TIPO, type TipoRecomendacao } from "@/lib/nutrition/evidence";
import { planoAtivo } from "@/lib/server/planos";
import { requireUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Por que o sistema recomendou isso?" };

const TOM: Record<TipoRecomendacao, "info" | "brand" | "warn" | "danger"> = { estimativa: "info", evidencia: "brand", hipotese: "warn", orientacao_profissional: "danger" };

function linkFonte(id: string) {
  const f = FONTE_MAP[id];
  if (!f) return null;
  const href = f.doi ? `https://doi.org/${f.doi}` : f.url;
  return (
    <li key={id} className="text-xs">
      {href ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className="font-medium text-brand underline">{f.titulo}</a>
      ) : (
        <span className="font-medium">{f.titulo}</span>
      )}{" "}
      <span className="text-muted">— {f.autores.replace(/\.$/, "")}. {f.periodico}, {f.ano}. {f.nivel}.</span>
    </li>
  );
}

export default async function Evidencias() {
  const { supabase, user } = await requireUser();
  const plano = await planoAtivo(supabase, user.id);
  const { data: recs } = plano ? await supabase.from("recommendations").select("*").eq("meal_plan_id", plano.id).order("created_at") : { data: [] };
  const calc = plano?.calculo as { formulas?: string[] } | undefined;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader titulo="Por que o sistema recomendou isso?" subtitulo="Cada recomendação mostra justificativa, evidência, fonte e limitações — e se é estimativa, evidência, hipótese ou algo a validar com profissional." />
      <div className="flex flex-wrap gap-2">
        {(Object.keys(ROTULO_TIPO) as TipoRecomendacao[]).map((t) => (
          <Badge key={t} tom={TOM[t]}>{ROTULO_TIPO[t]}</Badge>
        ))}
      </div>
      {!recs?.length ? (
        <Empty icon={BookOpen} titulo="Gere um plano para ver as justificativas" acao={<LinkButton href="/plano">Ir para o plano</LinkButton>} />
      ) : (
        recs.map((r) => (
          <Card key={r.id} className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-bold uppercase tracking-wide text-muted">{r.categoria}</p>
              <Badge tom={TOM[r.tipo as TipoRecomendacao]}>{ROTULO_TIPO[r.tipo as TipoRecomendacao]}</Badge>
            </div>
            <p className="font-bold">{r.recommendation}</p>
            <div className="text-sm">
              <p className="font-semibold">Justificativa</p>
              <p className="text-ink/85">{r.rationale}</p>
            </div>
            {r.dados_usuario && Object.keys(r.dados_usuario).length > 0 && (
              <details className="text-sm">
                <summary className="cursor-pointer font-semibold">Seus dados usados</summary>
                <pre className="mt-1 scroll-x whitespace-pre-wrap rounded-xl bg-surface-2 p-3 text-xs text-muted">{JSON.stringify(r.dados_usuario, null, 2)}</pre>
              </details>
            )}
            {r.scientific_source_ids?.length > 0 && (
              <div className="text-sm">
                <p className="font-semibold">Evidência: <span className="font-normal text-muted">{r.evidence_level}</span></p>
                <ul className="mt-1 space-y-1">{r.scientific_source_ids.map(linkFonte)}</ul>
              </div>
            )}
            <div className="rounded-2xl bg-warn-soft px-3 py-2 text-sm">
              <span className="font-semibold text-warn">Limitações: </span>
              {r.limitations}
            </div>
          </Card>
        ))
      )}
      {calc?.formulas && (
        <Card>
          <h2 className="font-bold">Fórmulas usadas no cálculo</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">{calc.formulas.map((f) => <li key={f}>{f}</li>)}</ul>
        </Card>
      )}
      <details className="group rounded-3xl border border-line/80 bg-surface shadow-card">
        <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-5 py-3">
          <span>
            <span className="block font-bold">Biblioteca de referências · {FONTES.length}</span>
            <span className="block text-[13px] text-muted">Diretrizes, consensos, revisões e ensaios — nenhum estudo isolado é tratado como prova definitiva.</span>
          </span>
          <ChevronDown size={20} className="shrink-0 text-muted transition group-open:rotate-180" aria-hidden />
        </summary>
        <ul className="space-y-3 border-t border-line/70 p-5">
          {FONTES.map((f) => (
            <li key={f.id} className="rounded-2xl bg-surface-2 p-3.5 text-sm">
              <p className="font-semibold leading-snug">{f.titulo}</p>
              <p className="mt-0.5 text-xs text-muted">{f.autores} · {f.periodico} · {f.ano}{f.doi && ` · DOI ${f.doi}`}</p>
              <p className="mt-2"><span className="font-medium">Tipo:</span> {f.tipo} · <span className="font-medium">População:</span> {f.populacao}</p>
              <p><span className="font-medium">Resultado:</span> {f.resultado}</p>
              <p className="text-muted"><span className="font-medium">Limitações:</span> {f.limitacoes}</p>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
