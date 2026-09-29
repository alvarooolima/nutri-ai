import type { Metadata } from "next";
import { AlertBox, Card, PageHeader } from "@/components/ui";
import { carregarPerfil, contextoCompleto } from "@/lib/server/perfil";
import { extrasAcompanhamento, sincronizarAlertas } from "@/lib/server/planos";
import { requireUser } from "@/lib/supabase/server";
import { MarcarLido } from "./cliente";

export const metadata: Metadata = { title: "Segurança e alertas" };

export default async function Alertas() {
  const { supabase, user } = await requireUser();
  // reavalia a cada visita para refletir o perfil e os registros mais recentes
  const perfil = await carregarPerfil(supabase, user.id);
  if (perfil.dataNascimento && perfil.peso && perfil.altura) {
    const { seguranca } = contextoCompleto(perfil, await extrasAcompanhamento(supabase, user.id));
    await sincronizarAlertas(supabase, user.id, seguranca.alertas);
  }
  const { data: alertas } = await supabase.from("alerts").select("*").eq("user_id", user.id).neq("status", "resolvido").order("created_at", { ascending: false });
  const ordem = { importante: 0, atencao: 1, info: 2 } as const;
  const lista = [...(alertas ?? [])].sort((a, b) => ordem[a.gravidade as keyof typeof ordem] - ordem[b.gravidade as keyof typeof ordem]);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHeader titulo="Segurança e alertas" subtitulo="Informações que podem exigir avaliação profissional. Não são diagnósticos." />
      <Card className="bg-danger-soft/60 text-sm">
        <p className="font-bold text-danger">Em caso de emergência</p>
        <p>Dor no peito, falta de ar, desmaio, sangramento intenso ou reação alérgica grave: ligue 192 (SAMU) ou procure o pronto-socorro.</p>
      </Card>
      {!lista.length ? (
        <Card><p className="text-sm text-muted">Nenhum alerta no momento. Os alertas são reavaliados quando você atualiza seu perfil, registra sintomas ou pesos.</p></Card>
      ) : (
        lista.map((a) => (
          <div key={a.id} className={a.status === "lido" ? "opacity-70" : ""}>
            <AlertBox gravidade={a.gravidade}>
              <p>{a.mensagem}</p>
              {a.acao_recomendada && <p className="mt-1 font-medium">O que fazer: {a.acao_recomendada}</p>}
              <MarcarLido id={a.id} lido={a.status === "lido"} />
            </AlertBox>
          </div>
        ))
      )}
    </div>
  );
}
